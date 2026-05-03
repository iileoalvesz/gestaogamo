import os
import sys
from django.apps import AppConfig


class SensorsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.sensors"
    verbose_name = "Sensores"
    default = True

    def ready(self):
        # Nunca inicia o scheduler em management commands (migrate, collectstatic, etc.)
        if "manage.py" in sys.argv[0]:
            # Dev server: inicia apenas no processo filho (evita dupla inicialização)
            if os.environ.get("RUN_MAIN") != "true":
                return
        # Gunicorn / produção: inicia normalmente
        from .scheduler import start_scheduler
        start_scheduler()
