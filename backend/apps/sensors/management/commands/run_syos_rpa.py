"""
Management command: executa o RPA do SYOS e importa o relatório semanal.

Uso:
    python manage.py run_syos_rpa

Pre-requisito:
    pip install playwright
    playwright install chromium
"""

from django.core.management.base import BaseCommand
from apps.sensors.rpa import run_syos_rpa


class Command(BaseCommand):
    help = "Executa o RPA do SYOS, baixa o Excel semanal e importa as leituras."

    def handle(self, *args, **options):
        self.stdout.write("Iniciando RPA do SYOS...")
        try:
            result = run_syos_rpa(user=None)
            self.stdout.write(self.style.SUCCESS(result["message"]))
            self.stdout.write(f"  Periodo: {result['period_start']} - {result['period_end']}")
            self.stdout.write(f"  Linhas importadas: {result['total_rows']}")
            if result.get("new_sensors_without_config"):
                self.stdout.write(
                    self.style.WARNING(
                        f"  Sensores sem config T: {result['new_sensors_without_config']}"
                    )
                )
        except Exception as exc:
            self.stdout.write(self.style.ERROR(f"Erro: {exc}"))
