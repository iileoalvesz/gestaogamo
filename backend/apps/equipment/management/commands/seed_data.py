"""
Limpa todos os equipamentos e recria os 38 termômetros.
Uso: python manage.py seed_data
"""

from datetime import date
from django.core.management.base import BaseCommand
from apps.equipment.models import Equipment, CalibrationCertificate


def d(s):
    """Converte DD/MM/YYYY para date, retorna None para '-' ou vazio."""
    if not s or s.strip() in ("-", ""):
        return None
    try:
        day, month, year = s.strip().split("/")
        return date(int(year), int(month), int(day))
    except Exception:
        return None


SITUATION_MAP = {
    "Calibrado":   "ativo",
    "Fora de Uso": "fora_de_uso",
    "Danificado":  "danificado",
    "Perdido":     "perdido",
}

# Columns: name, location, model, identification, serial_number,
#          certificate_number, last_cal, next_cal, situation
EQUIPMENT_DATA = [
    ("TER-MASTER",             "Qualidade",           "testo 104",           "88962",       "46488962",       "42.090/26",    "22/01/2026", "22/01/2027", "Calibrado"),
    ("TER-MASTER (RESERVA)",   "Qualidade",           "testo 104",           "59394",       "35859394",       "38.779/25",    "26/05/2025", "26/05/2026", "Calibrado"),
    ("TER-QUAL-1",             "Qualidade",           "testo 104",           "7583",        "35807583",       "38.777/25",    "26/05/2025", "26/05/2026", "Calibrado"),
    ("TER-QUAL-2",             "Qualidade",           "testo 926",           "3/1120",      "33848073/1120",  "42.081/26",    "22/01/2026", "22/01/2027", "Calibrado"),
    ("TER-QUAL-3",             "Qualidade",           "testo 926",           "4/1120",      "33848094/1120",  "42.080/26",    "22/01/2026", "22/01/2027", "Calibrado"),
    ("TER-QUAL-4",             "Qualidade",           "testo 926",           "34/120",      "33848134/1120",  "42.082/26",    "22/01/2026", "22/01/2027", "Calibrado"),
    ("TER-QUAL-3 (SENSOR)",    "Qualidade",           "testo 106",           "2/106",       "06032192/16",    "42.092/26",    "22/01/2026", "22/01/2027", "Calibrado"),
    ("TER-QUAL-4 (SENSOR)",    "Qualidade",           "testo 106",           "2/106",       "06032192/106",   "42.091/26",    "22/01/2026", "22/01/2027", "Calibrado"),
    ("TER-QUAL-5 (SENSOR)",    "Qualidade",           "testo 106",           "2/106",       "06032192/106",   "42.093/26",    "22/01/2026", "22/01/2027", "Calibrado"),
    ("TER-RECEB-1",            "Recebimento - T1",    "testo 104",           "87995",       "46487995",       "42.084/26",    "22/01/2026", "22/01/2027", "Calibrado"),
    ("TER-RECEB-2",            "Recebimento - T1",    "testo 104",           "59393",       "35859393",       "38.768/25",    "26/05/2025", "26/05/2026", "Calibrado"),
    ("TER-RECEB-3",            "Recebimento - T1",    "testo 104",           "59405",       "35859405",       "38.767/25",    "26/05/2025", "26/05/2026", "Calibrado"),
    ("TER-RECEB-4",            "Recebimento - T2",    "testo 104",           "18887",       "46618887",       "42.083/26",    "22/01/2026", "22/01/2027", "Calibrado"),
    ("TER-RECEB-5",            "Recebimento - T2",    "testo 104",           "12701",       "46812701",       "42.087/26",    "22/01/2026", "22/01/2027", "Calibrado"),
    ("TER-RECEB-6",            "Recebimento - T2",    "testo 104",           "59415",       "35859415",       "37.115/25",    "26/05/2025", "26/05/2026", "Calibrado"),
    ("TER-RECEB-7",            "Recebimento - T3",    "testo 104",           "53871",       "35853871",       "42.086/26",    "22/01/2026", "22/01/2027", "Calibrado"),
    ("TER-RECEB-8",            "Recebimento - T3",    "testo 104",           "94712",       "46494712",       "42.088/26",    "22/01/2026", "22/01/2027", "Calibrado"),
    ("TER-RECEB-9",            "Recebimento - T3",    "testo 104",           "18840",       "46618840",       "42.085/26",    "22/01/2026", "22/01/2027", "Calibrado"),
    ("TER-RET.ROTA-1",         "Retorno de Rota",     "testo 104",           "87965",       "46487965",       "42.089/26",    "22/01/2026", "22/01/2027", "Calibrado"),
    ("1 -CARREG. T-1",         "Carregamento T1",     "testo 104",           "84635",       "46484635",       "38.772/25",    "26/05/2025", "26/05/2026", "Calibrado"),
    ("2 -CARREG. T-1",         "Carregamento T1",     "testo 104",           "84862",       "4684862",        "38.766/25",    "26/05/2025", "26/05/2026", "Calibrado"),
    ("1 -CARREG. T-2",         "Carregamento T2",     "testo 104",           "60314",       "35859500",       "38.771/25",    "26/05/2025", "26/05/2026", "Calibrado"),
    ("2 -CARREG. T-2",         "Carregamento T2",     "testo 104",           "38506",       "35838506",       "38.773/25",    "26/05/2025", "26/05/2026", "Calibrado"),
    ("3 -CARREG. T-2",         "Carregamento T2",     "testo 104",           "7622",        "35807622",       "38.778/25",    "26/05/2025", "26/05/2026", "Calibrado"),
    ("1 -CARREG. T-3",         "Carregamento T3",     "testo 104",           "59403",       "35859403",       "38.776/25",    "26/05/2025", "26/05/2026", "Calibrado"),
    ("2 -CARREG. T-3",         "Carregamento T3",     "testo 104",           "59500",       "35859500",       "38.770/25",    "26/05/2025", "26/05/2026", "Calibrado"),
    ("3 -CARREG. T-3",         "Carregamento T3",     "testo 104",           "87988",       "46487988",       "38.775/25",    "26/05/2025", "26/05/2026", "Calibrado"),
    ("TER-RESERVA-1",          "Qualidade",           "testo 104",           "37.115/25",   "35856508",       "37.115/25",    "26/05/2025", "26/05/2026", "Calibrado"),
    ("TER-RESERVA-2",          "Qualidade",           "testo 106",           "94/712",      "51108394/712",   "38.780/25",    "26/05/2025", "26/05/2026", "Calibrado"),
    ("TER-RESERVA-3",          "Qualidade",           "testo 106",           "04/712",      "51108604/712",   "38.781/25",    "26/05/2025", "26/05/2026", "Calibrado"),
    ("TER-RESERVA-4",          "Qualidade",           "testo 104-IR",        "01581",       "86001581",       "-",            "-",          "-",          "Fora de Uso"),
    ("TER-RESERVA-5",          "Qualidade",           "testo 104-IR",        "01338",       "86001338",       "-",            "-",          "-",          "Fora de Uso"),
    ("TER-RESERVA-6",          "Qualidade",           "testo 104-IR",        "01326",       "86001326",       "-",            "-",          "-",          "Fora de Uso"),
    ("TER-RECEB-1 (DANIF.)",   "Qualidade",           "testo 104",           "53473",       "35853473",       "37.110/25",    "03/02/2025", "03/02/2026", "Danificado"),
    ("TER-RECEB. 1 (DANIF.)",  "Qualidade",           "testo 104 (DANIF.)",  "58941",       "35858941",       "35063/165805", "30/04/2024", "30/04/2025", "Danificado"),
    ("TER-RECEB-2 (F.USO)",    "Qualidade",           "testo 104",           "",            "35838520",       "37.116/25",    "03/02/2025", "03/02/2026", "Fora de Uso"),
    ("TER-RECEB-3 (PERDIDO)",  "Qualidade",           "testo 104",           "53872",       "35853872",       "38.774/225",   "26/05/2025", "26/05/2026", "Perdido"),
    ("TER-RECEB-3 (DANIF.)",   "Qualidade",           "testo 104 (DANIF.)",  "94357",       "46494357",       "37.202/25",    "07/02/2025", "07/02/2026", "Danificado"),
]


class Command(BaseCommand):
    help = "Limpa todos os equipamentos e importa os 38 termômetros"

    def handle(self, *args, **options):
        self.stdout.write("Deletando todos os equipamentos e certificados...")
        CalibrationCertificate.objects.all().delete()
        deleted, _ = Equipment.objects.all().delete()
        self.stdout.write(self.style.WARNING(f"  {deleted} equipamento(s) removido(s)."))

        created = 0
        for row in EQUIPMENT_DATA:
            name, location, model, identification, serial_number, cert_num, last_cal_str, next_cal_str, situation_label = row

            last_cal = d(last_cal_str)
            next_cal = d(next_cal_str)
            situation = SITUATION_MAP.get(situation_label, "ativo")

            freq = 365
            if last_cal and next_cal:
                diff = (next_cal - last_cal).days
                if diff > 0:
                    freq = diff

            eq = Equipment(
                equipment_type="termometro",
                name=name,
                location=location,
                model=model,
                identification=identification.strip(),
                serial_number=serial_number,
                certificate_number=cert_num if cert_num != "-" else "",
                calibration_frequency_days=freq,
                last_calibration_date=last_cal,
                next_calibration_date=next_cal,
                situation=situation,
            )
            eq.save()
            created += 1
            self.stdout.write(f"  [OK] {name}")

        self.stdout.write(self.style.SUCCESS(f"\n{created} equipamento(s) importado(s) com sucesso."))
