import io
import threading
from datetime import datetime, timedelta

from django.db.models import Count, Q, Min, Max, Avg
from django.http import HttpResponse
from rest_framework import generics, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SensorImport, SensorLocation, SensorReading, RpaJobLog
from .serializers import (
    SensorImportSerializer,
    SensorLocationSerializer,
    SensorReadingSerializer,
    SensorSummarySerializer,
)
from .importer import import_syos_excel

# In-memory RPA status (sufficient for single-worker dev server)
_rpa_state: dict = {"running": False, "status": "idle", "message": ""}


class SensorLocationListView(generics.ListCreateAPIView):
    queryset = SensorLocation.objects.filter(is_active=True)
    serializer_class = SensorLocationSerializer
    permission_classes = [IsAuthenticated]


class SensorLocationDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = SensorLocation.objects.all()
    serializer_class = SensorLocationSerializer
    permission_classes = [IsAuthenticated]


class SensorImportListView(generics.ListAPIView):
    queryset = SensorImport.objects.all()
    serializer_class = SensorImportSerializer
    permission_classes = [IsAuthenticated]


class SensorImportView(APIView):
    """Upload a SYOS Excel file and import its readings."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        excel_file = request.FILES.get("file")
        if not excel_file:
            return Response({"detail": "Nenhum arquivo enviado."}, status=400)
        if not excel_file.name.lower().endswith((".xlsx", ".xls")):
            return Response({"detail": "Apenas arquivos Excel (.xlsx) são aceitos."}, status=400)

        try:
            result = import_syos_excel(excel_file.read(), user=request.user)
            return Response(result, status=status.HTTP_201_CREATED)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=400)


class SensorSummaryView(APIView):
    """Returns compliance summary per sensor location for a date range."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        period_start = request.query_params.get("period_start")
        period_end = request.query_params.get("period_end")

        qs = SensorReading.objects.select_related("sensor")
        if period_start:
            qs = qs.filter(recorded_at__date__gte=period_start)
        if period_end:
            qs = qs.filter(recorded_at__date__lte=period_end)

        sensors = SensorLocation.objects.filter(is_active=True).order_by("name")
        results = []
        for sensor in sensors:
            sensor_qs = qs.filter(sensor=sensor)
            total = sensor_qs.count()
            if total == 0:
                continue
            ok = sensor_qs.filter(is_ok=True).count()
            agg = sensor_qs.aggregate(
                min_t=Min("temperature"),
                max_t=Max("temperature"),
                avg_t=Avg("temperature"),
            )
            results.append(
                {
                    "sensor_id":     sensor.id,
                    "name":          sensor.name,
                    "syos_nickname": sensor.syos_nickname,
                    "temp_standard": sensor.temp_standard,
                    "min_temp":      sensor.min_temp,
                    "max_temp":      sensor.max_temp,
                    "meta_target":   sensor.meta_target,
                    "total_readings": total,
                    "ok_readings":   ok,
                    "compliance_pct": round(ok / total, 4) if total else 0,
                    "min_recorded":  float(agg["min_t"]) if agg["min_t"] is not None else None,
                    "max_recorded":  float(agg["max_t"]) if agg["max_t"] is not None else None,
                    "avg_recorded":  round(float(agg["avg_t"]), 2) if agg["avg_t"] is not None else None,
                }
            )

        return Response(results)


class SensorReadingsView(generics.ListAPIView):
    serializer_class = SensorReadingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = SensorReading.objects.select_related("sensor").order_by("recorded_at")
        sensor_id = self.request.query_params.get("sensor_id")
        period_start = self.request.query_params.get("period_start")
        period_end = self.request.query_params.get("period_end")
        if sensor_id:
            qs = qs.filter(sensor_id=sensor_id)
        if period_start:
            qs = qs.filter(recorded_at__date__gte=period_start)
        if period_end:
            qs = qs.filter(recorded_at__date__lte=period_end)
        return qs


class RpaTriggerView(APIView):
    """Triggers the SYOS RPA in a background thread."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if _rpa_state["running"]:
            return Response(
                {"status": "running", "message": "RPA já está em execução."},
                status=status.HTTP_409_CONFLICT,
            )

        from .rpa import _last_week_range
        monday, sunday = _last_week_range()
        log = RpaJobLog.objects.create(
            trigger=RpaJobLog.TRIGGER_MANUAL,
            period_start=monday,
            period_end=sunday,
            status=RpaJobLog.STATUS_RUNNING,
            triggered_by=request.user,
        )

        def run():
            from django.utils import timezone as tz
            _rpa_state["running"] = True
            _rpa_state["status"] = "running"
            _rpa_state["message"] = "Executando RPA..."
            try:
                from .rpa import run_syos_rpa
                result = run_syos_rpa(user=request.user)
                _rpa_state["status"] = "done"
                _rpa_state["message"] = result.get("message", "Concluído.")
                log.status = RpaJobLog.STATUS_DONE
                log.message = _rpa_state["message"]
                log.total_rows = result.get("total_rows")
            except Exception as exc:
                _rpa_state["status"] = "error"
                _rpa_state["message"] = str(exc)
                log.status = RpaJobLog.STATUS_ERROR
                log.message = str(exc)
            finally:
                _rpa_state["running"] = False
                log.finished_at = tz.now()
                log.save(update_fields=["status", "message", "total_rows", "finished_at"])

        threading.Thread(target=run, daemon=True).start()
        return Response({"status": "started", "message": "RPA iniciado em segundo plano."})

    def get(self, request):
        return Response(_rpa_state)


class SensorExportView(APIView):
    """Downloads sensor readings as an Excel file matching the Sensores.xlsx template."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .exporter import generate_sensor_excel
        period_start = request.query_params.get("period_start")
        period_end   = request.query_params.get("period_end")

        xlsx_bytes = generate_sensor_excel(period_start, period_end)

        filename = "Sensores"
        if period_start:
            filename += f"_{period_start}"
        if period_end:
            filename += f"_{period_end}"
        filename += ".xlsx"

        response = HttpResponse(
            xlsx_bytes,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response
