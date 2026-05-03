from decimal import Decimal
from django.db import models
from django.conf import settings


class SensorLocation(models.Model):
    """Configures an individual sensor/monitoring point with its acceptable temperature range."""
    name = models.CharField("Nome", max_length=200)
    syos_nickname = models.CharField(
        "Apelido no SYOS",
        max_length=200,
        unique=True,
        help_text="Valor exato do campo 'Apelido do Módulo' na exportação SYOS",
    )
    temp_standard = models.CharField("Padrão T°C (ex: 1 à 7°C)", max_length=50, blank=True)
    min_temp = models.DecimalField(
        "Temperatura Mínima Aceitável (°C)",
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
    )
    max_temp = models.DecimalField(
        "Temperatura Máxima Aceitável (°C)",
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
    )
    meta_target = models.DecimalField(
        "Meta de Conformidade (%)",
        max_digits=4,
        decimal_places=2,
        default=Decimal("0.85"),
        help_text="Ex: 0.85 = 85%",
    )
    is_active = models.BooleanField("Ativo", default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Sensor"
        verbose_name_plural = "Sensores"
        ordering = ["name"]

    def __str__(self):
        return self.name


class SensorImport(models.Model):
    STATUS_PENDING = "pending"
    STATUS_DONE = "done"
    STATUS_ERROR = "error"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Processando"),
        (STATUS_DONE, "Concluído"),
        (STATUS_ERROR, "Erro"),
    ]

    period_start = models.DateTimeField("Início do Período")
    period_end = models.DateTimeField("Fim do Período")
    import_status = models.CharField(
        "Status", max_length=20, choices=STATUS_CHOICES, default=STATUS_DONE
    )
    error_message = models.TextField("Mensagem de Erro", blank=True)
    total_rows = models.IntegerField("Total de Linhas Importadas", default=0)
    imported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Importação"
        verbose_name_plural = "Importações"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Import {self.period_start.date()} – {self.period_end.date()}"


class RpaJobLog(models.Model):
    TRIGGER_SCHEDULER = "scheduler"
    TRIGGER_MANUAL = "manual"
    TRIGGER_CHOICES = [
        (TRIGGER_SCHEDULER, "Agendado (automático)"),
        (TRIGGER_MANUAL, "Manual"),
    ]

    STATUS_RUNNING = "running"
    STATUS_DONE = "done"
    STATUS_ERROR = "error"
    STATUS_CHOICES = [
        (STATUS_RUNNING, "Em execução"),
        (STATUS_DONE, "Concluído"),
        (STATUS_ERROR, "Erro"),
    ]

    trigger = models.CharField("Origem", max_length=20, choices=TRIGGER_CHOICES, default=TRIGGER_MANUAL)
    period_start = models.DateField("Início do Período", null=True, blank=True)
    period_end = models.DateField("Fim do Período", null=True, blank=True)
    started_at = models.DateTimeField("Iniciado em", auto_now_add=True)
    finished_at = models.DateTimeField("Finalizado em", null=True, blank=True)
    status = models.CharField("Status", max_length=20, choices=STATUS_CHOICES, default=STATUS_RUNNING)
    message = models.TextField("Mensagem", blank=True)
    total_rows = models.IntegerField("Linhas importadas", null=True, blank=True)
    triggered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Usuário",
    )

    class Meta:
        verbose_name = "Execução RPA"
        verbose_name_plural = "Execuções RPA"
        ordering = ["-started_at"]

    def __str__(self):
        period = ""
        if self.period_start and self.period_end:
            period = f" | {self.period_start} → {self.period_end}"
        return f"[{self.get_status_display()}] {self.get_trigger_display()}{period} — {self.started_at:%d/%m/%Y %H:%M}"


class SensorReading(models.Model):
    """Single temperature reading from a sensor at a specific date/time."""
    import_batch = models.ForeignKey(
        SensorImport, on_delete=models.CASCADE, related_name="readings"
    )
    sensor = models.ForeignKey(
        SensorLocation, on_delete=models.CASCADE, related_name="readings"
    )
    recorded_at = models.DateTimeField("Data/Hora")
    temperature = models.DecimalField("Temperatura °C", max_digits=6, decimal_places=2)
    is_ok = models.BooleanField("Dentro do Padrão")

    class Meta:
        verbose_name = "Leitura"
        verbose_name_plural = "Leituras"
        ordering = ["sensor", "recorded_at"]
        indexes = [
            models.Index(fields=["sensor", "recorded_at"], name="sensors_sen_sensor__idx"),
            models.Index(fields=["import_batch"], name="sensors_sen_import__idx"),
        ]

    def __str__(self):
        return f"{self.sensor.name} @ {self.recorded_at}: {self.temperature}°C"
