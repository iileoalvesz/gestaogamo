import os
from django.apps import AppConfig


class SensorsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.sensors"
    verbose_name = "Sensores"
    default = True

    def ready(self):
        # Evita dupla inicialização no dev server (reloader fork)
        if os.environ.get("RUN_MAIN") != "true":
            return
        from .scheduler import start_scheduler
        start_scheduler()
