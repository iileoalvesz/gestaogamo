from datetime import date, timedelta
from django.db import models
from django.conf import settings


class EquipmentType(models.TextChoices):
    BALANCA = "balanca", "Balança"
    SYOS = "syos", "SYOS"
    LOGGER = "logger", "Logger"
    PAQUIMETRO = "paquimetro", "Paquímetro"
    TERMOMETRO = "termometro", "Termômetro Espeto"
    OUTRO = "outro", "Outro"


class Equipment(models.Model):
    SITUATION_ATIVO = "ativo"
    SITUATION_DANIFICADO = "danificado"
    SITUATION_PERDIDO = "perdido"
    SITUATION_FORA_DE_USO = "fora_de_uso"
    SITUATION_CHOICES = [
        (SITUATION_ATIVO, "Ativo"),
        (SITUATION_DANIFICADO, "Danificado"),
        (SITUATION_PERDIDO, "Perdido"),
        (SITUATION_FORA_DE_USO, "Fora de Uso"),
    ]

    STATUS_EM_DIA = "em_dia"
    STATUS_A_VENCER = "a_vencer"
    STATUS_VENCIDO = "vencido"
    STATUS_SEM_DATA = "sem_data"

    equipment_type = models.CharField(
        max_length=20, choices=EquipmentType.choices, default=EquipmentType.OUTRO
    )
    name = models.CharField("Equipamento", max_length=200)
    location = models.CharField("Local", max_length=200, blank=True)
    model = models.CharField("Modelo", max_length=200, blank=True)
    identification = models.CharField("Identificação", max_length=200, blank=True)
    serial_number = models.CharField("N.º Série", max_length=200, blank=True)
    certificate_number = models.CharField("N.º Certificado", max_length=200, blank=True)
    calibration_frequency_days = models.IntegerField("Frequência (dias)", default=365)
    last_calibration_date = models.DateField("Última Calibração", null=True, blank=True)
    next_calibration_date = models.DateField("Próxima Calibração", null=True, blank=True)
    situation = models.CharField(
        "Situação", max_length=20, choices=SITUATION_CHOICES, default=SITUATION_ATIVO
    )
    certificate_file = models.FileField(
        "Certificado PDF", upload_to="certificates/", null=True, blank=True
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="equipment_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Equipamento"
        verbose_name_plural = "Equipamentos"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.identification})"

    @property
    def status(self):
        if self.situation in (self.SITUATION_DANIFICADO, self.SITUATION_PERDIDO, self.SITUATION_FORA_DE_USO):
            return self.situation
        if not self.next_calibration_date:
            return self.STATUS_SEM_DATA
        today = date.today()
        delta = (self.next_calibration_date - today).days
        if delta < 0:
            return self.STATUS_VENCIDO
        if delta <= 30:
            return self.STATUS_A_VENCER
        return self.STATUS_EM_DIA

    @property
    def days_until_expiration(self):
        if not self.next_calibration_date:
            return None
        return (self.next_calibration_date - date.today()).days

    def save(self, *args, **kwargs):
        if self.last_calibration_date and not self.next_calibration_date:
            self.next_calibration_date = self.last_calibration_date + timedelta(
                days=self.calibration_frequency_days
            )
        super().save(*args, **kwargs)


class CalibrationCertificate(models.Model):
    equipment = models.ForeignKey(
        Equipment, on_delete=models.CASCADE, related_name="certificates"
    )
    certificate_number = models.CharField("N.º Certificado", max_length=200, blank=True)
    issue_date = models.DateField("Data de Emissão", null=True, blank=True)
    validity_months = models.IntegerField("Validade (meses)", default=12)
    requestor = models.CharField("Solicitante", max_length=500, blank=True)
    material_type = models.CharField("Material", max_length=200, blank=True)
    manufacturer = models.CharField("Fabricante", max_length=200, blank=True)
    model = models.CharField("Modelo", max_length=200, blank=True)
    serial_number = models.CharField("N.º Série", max_length=200, blank=True)
    identification = models.CharField("Identificação", max_length=200, blank=True)
    measurement_range = models.CharField("Faixa de Medição", max_length=200, blank=True)
    resolution = models.CharField("Resolução", max_length=100, blank=True)
    calibration_status = models.CharField("Status Calibração", max_length=100, blank=True)
    pdf_file = models.FileField("PDF", upload_to="certificates/")
    raw_extracted_text = models.TextField("Texto Extraído", blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Certificado de Calibração"
        verbose_name_plural = "Certificados de Calibração"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Cert. {self.certificate_number} - {self.equipment}"
