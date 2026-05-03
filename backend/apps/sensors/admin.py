from django.contrib import admin
from django.utils.html import format_html
from .models import SensorLocation, SensorImport, SensorReading, RpaJobLog


@admin.register(SensorLocation)
class SensorLocationAdmin(admin.ModelAdmin):
    list_display = ("name", "syos_nickname", "temp_standard", "min_temp", "max_temp", "meta_target", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "syos_nickname")


@admin.register(SensorImport)
class SensorImportAdmin(admin.ModelAdmin):
    list_display = ("period_start", "period_end", "import_status", "total_rows", "imported_by", "created_at")
    list_filter = ("import_status",)
    readonly_fields = ("created_at",)


@admin.register(SensorReading)
class SensorReadingAdmin(admin.ModelAdmin):
    list_display = ("sensor", "recorded_at", "temperature", "is_ok", "import_batch")
    list_filter = ("is_ok", "sensor")
    search_fields = ("sensor__name",)


_STATUS_COLORS = {
    "running": ("#2563EB", "Em execução"),
    "done":    ("#16A34A", "Concluído"),
    "error":   ("#DC2626", "Erro"),
}

_TRIGGER_ICONS = {
    "scheduler": "🕐",
    "manual":    "👤",
}


@admin.register(RpaJobLog)
class RpaJobLogAdmin(admin.ModelAdmin):
    list_display = (
        "started_at_fmt",
        "trigger_fmt",
        "status_badge",
        "period_fmt",
        "duration_fmt",
        "total_rows",
        "triggered_by",
        "message_short",
    )
    list_filter = ("status", "trigger")
    date_hierarchy = "started_at"
    search_fields = ("message",)
    readonly_fields = (
        "trigger", "period_start", "period_end",
        "started_at", "finished_at", "status",
        "message", "total_rows", "triggered_by",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    @admin.display(description="Iniciado em", ordering="started_at")
    def started_at_fmt(self, obj):
        return obj.started_at.strftime("%d/%m/%Y %H:%M:%S")

    @admin.display(description="Origem")
    def trigger_fmt(self, obj):
        icon = _TRIGGER_ICONS.get(obj.trigger, "")
        return f"{icon} {obj.get_trigger_display()}"

    @admin.display(description="Status")
    def status_badge(self, obj):
        color, label = _STATUS_COLORS.get(obj.status, ("#6B7280", obj.status))
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 10px;border-radius:12px;font-size:0.8rem;font-weight:600">{}</span>',
            color,
            label,
        )

    @admin.display(description="Período")
    def period_fmt(self, obj):
        if obj.period_start and obj.period_end:
            s = obj.period_start.strftime("%d/%m/%Y")
            e = obj.period_end.strftime("%d/%m/%Y")
            return f"{s} → {e}"
        return "—"

    @admin.display(description="Duração")
    def duration_fmt(self, obj):
        if obj.finished_at and obj.started_at:
            delta = obj.finished_at - obj.started_at
            total = int(delta.total_seconds())
            m, s = divmod(total, 60)
            return f"{m}m {s}s" if m else f"{s}s"
        if obj.status == "running":
            return "em andamento…"
        return "—"

    @admin.display(description="Mensagem")
    def message_short(self, obj):
        if not obj.message:
            return "—"
        return obj.message[:80] + ("…" if len(obj.message) > 80 else "")
