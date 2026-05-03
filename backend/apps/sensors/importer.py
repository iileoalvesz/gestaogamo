"""
Parses the SYOS 'Gross report per period' Excel export and persists readings.

Column map (1-based, header on row 1):
  3  Data           - datetime of the reading
  4  Apelido do balcão - location / chamber name (e.g. "ANTECÂMARA 3")
  8  Sensor ID      - unique hardware ID per physical sensor (e.g. "00-02 : 00-EA-8A")
 11  Temperatura    - measured temperature (°C)
 17  Faixa          - acceptable range (e.g. "Min 1℃ - Max 7℃")

Each Sensor ID maps to one SensorLocation record. The same chamber name
(Apelido do balcão) may have multiple sensor IDs (e.g. Início and Fim).
OK/NÃO OK is determined per row: min_limit ≤ temperature ≤ max_limit,
where limits come from the Faixa column — NOT from previously stored config.
"""

import io
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation

import openpyxl

from .models import SensorImport, SensorLocation, SensorReading

COL_DATE      = 3   # Data
COL_BALCAO    = 4   # Apelido do balcão (chamber / location name)
COL_SENSOR_ID = 8   # Sensor ID — unique per physical sensor
COL_TEMP      = 11  # Temperatura (°C)
COL_FAIXA     = 17  # Faixa: "Min 1℃ - Max 7℃"

_FAIXA_RE = re.compile(r'Min\s*([-\d,.]+).*?Max\s*([-\d,.]+)', re.IGNORECASE)


def _parse_dt(val) -> datetime | None:
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    s = str(val).strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%d/%m/%Y %H:%M", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def _parse_faixa(val) -> tuple:
    """
    Returns (min_t: float|None, max_t: float|None, temp_standard: str).
    Parses strings like "Min 1℃ - Max 7℃" or "Min -23℃ - Max -18℃".
    """
    if not val:
        return None, None, ""
    s = str(val)
    m = _FAIXA_RE.search(s)
    if not m:
        return None, None, s
    try:
        min_t = float(m.group(1).replace(",", "."))
        max_t = float(m.group(2).replace(",", "."))
        # Format: "1°C a 7°C"  /  "-23°C a -18°C"
        def fmt_n(n):
            return str(int(n)) if n == int(n) else str(n)
        std = f"{fmt_n(min_t)}°C a {fmt_n(max_t)}°C"
        return min_t, max_t, std
    except (ValueError, AttributeError):
        return None, None, s


def import_syos_excel(file_bytes: bytes, user=None) -> dict:
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
    ws = wb.active

    rows = list(ws.iter_rows(min_row=2, values_only=True))  # skip header
    if not rows:
        raise ValueError("Planilha vazia ou formato inesperado.")

    readings_data = []  # list of (sensor_id, balcao, dt, temp, min_limit, max_limit, temp_standard)
    dates = []

    for row in rows:
        try:
            sensor_id = row[COL_SENSOR_ID - 1]
            balcao    = row[COL_BALCAO - 1]
            temp_val  = row[COL_TEMP - 1]
            dt_val    = row[COL_DATE - 1]
            faixa_val = row[COL_FAIXA - 1] if len(row) >= COL_FAIXA else None
        except IndexError:
            continue

        if sensor_id is None or temp_val is None:
            continue

        dt = _parse_dt(dt_val)
        if dt is None:
            continue

        try:
            temp = float(str(temp_val).replace(",", "."))
        except (TypeError, ValueError):
            continue

        min_limit, max_limit, temp_std = _parse_faixa(faixa_val)
        dates.append(dt)
        readings_data.append((
            str(sensor_id).strip(),
            str(balcao).strip() if balcao else str(sensor_id).strip(),
            dt,
            temp,
            min_limit,
            max_limit,
            temp_std,
        ))

    if not readings_data:
        raise ValueError("Nenhuma leitura válida encontrada no arquivo.")

    period_start = min(dates)
    period_end   = max(dates)

    batch = SensorImport.objects.create(
        period_start=period_start,
        period_end=period_end,
        import_status=SensorImport.STATUS_DONE,
        total_rows=len(readings_data),
        imported_by=user,
    )

    # Build sensor cache keyed by Sensor ID (syos_nickname)
    sensor_cache: dict[str, SensorLocation] = {}

    to_create = []
    for sensor_id, balcao, dt, temp, min_limit, max_limit, temp_std in readings_data:
        if sensor_id not in sensor_cache:
            sensor, created = SensorLocation.objects.get_or_create(
                syos_nickname=sensor_id,
                defaults={
                    "name": balcao,
                    "temp_standard": temp_std,
                    "min_temp": Decimal(str(min_limit)) if min_limit is not None else None,
                    "max_temp": Decimal(str(max_limit)) if max_limit is not None else None,
                },
            )
            # If sensor already existed, refresh min/max from the imported Faixa
            if not created and min_limit is not None:
                update_fields = []
                new_min = Decimal(str(min_limit))
                new_max = Decimal(str(max_limit))
                if sensor.min_temp != new_min:
                    sensor.min_temp = new_min
                    update_fields.append("min_temp")
                if sensor.max_temp != new_max:
                    sensor.max_temp = new_max
                    update_fields.append("max_temp")
                if sensor.temp_standard != temp_std and temp_std:
                    sensor.temp_standard = temp_std
                    update_fields.append("temp_standard")
                if sensor.name != balcao and balcao:
                    sensor.name = balcao
                    update_fields.append("name")
                if update_fields:
                    sensor.save(update_fields=update_fields)
            sensor_cache[sensor_id] = sensor

        sensor = sensor_cache[sensor_id]

        # Determine is_ok from the row's own Faixa limits (source of truth)
        if min_limit is not None and max_limit is not None:
            is_ok = min_limit <= temp <= max_limit
        elif sensor.min_temp is not None and sensor.max_temp is not None:
            is_ok = float(sensor.min_temp) <= temp <= float(sensor.max_temp)
        else:
            is_ok = True  # no limits defined yet

        to_create.append(
            SensorReading(
                import_batch=batch,
                sensor=sensor,
                recorded_at=dt,
                temperature=temp,
                is_ok=is_ok,
            )
        )

    SensorReading.objects.bulk_create(to_create, batch_size=500)

    no_config = [sid for sid, s in sensor_cache.items() if s.min_temp is None]
    return {
        "import_id":                 batch.id,
        "total_rows":                len(to_create),
        "period_start":              period_start.isoformat(),
        "period_end":                period_end.isoformat(),
        "sensors_found":             len(sensor_cache),
        "new_sensors_without_config": no_config,
        "message": (
            f"{len(to_create)} leituras importadas de {len(sensor_cache)} sensores."
            + (f" {len(no_config)} sensor(es) sem faixa de temperatura configurada." if no_config else "")
        ),
    }
