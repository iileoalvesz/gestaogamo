"""
Agendamento do RPA de Sensores via APScheduler.

Job: todo domingo às 22:00 (horário de Brasília), executa o RPA cobrindo
a semana corrente (segunda-feira a domingo).
"""

import logging
from datetime import date, timedelta

logger = logging.getLogger(__name__)

_scheduler = None


def _current_week_range():
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    return monday, sunday


def weekly_sensor_rpa():
    from django.utils import timezone
    from .models import RpaJobLog

    monday, sunday = _current_week_range()
    logger.info("[scheduler] Iniciando RPA semanal: %s → %s", monday, sunday)

    log = RpaJobLog.objects.create(
        trigger=RpaJobLog.TRIGGER_SCHEDULER,
        period_start=monday,
        period_end=sunday,
        status=RpaJobLog.STATUS_RUNNING,
    )

    try:
        from .rpa import run_syos_rpa
        result = run_syos_rpa(monday=monday, sunday=sunday)
        log.status = RpaJobLog.STATUS_DONE
        log.message = result.get("message", "Concluído.")
        log.total_rows = result.get("total_rows")
        logger.info("[scheduler] RPA concluído: %s", result)
    except Exception as exc:
        log.status = RpaJobLog.STATUS_ERROR
        log.message = str(exc)
        logger.error("[scheduler] Falha no RPA semanal: %s", exc, exc_info=True)
    finally:
        log.finished_at = timezone.now()
        log.save(update_fields=["status", "message", "total_rows", "finished_at"])


def start_scheduler():
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        return

    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.cron import CronTrigger
        import pytz
    except ImportError:
        logger.warning(
            "[scheduler] apscheduler não instalado — job semanal desativado. "
            "Execute: pip install apscheduler pytz"
        )
        return

    tz = pytz.timezone("America/Sao_Paulo")
    _scheduler = BackgroundScheduler(timezone=tz)
    _scheduler.add_job(
        weekly_sensor_rpa,
        CronTrigger(day_of_week="sun", hour=22, minute=0, timezone=tz),
        id="weekly_sensor_rpa",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    _scheduler.start()
    logger.info("[scheduler] APScheduler iniciado — RPA toda domingo às 22:00 BRT")
