from django.contrib import admin
from .models import Equipment, CalibrationCertificate


@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    list_display = (
        "name", "identification", "equipment_type", "location",
        "model", "last_calibration_date", "next_calibration_date", "situation",
    )
    list_filter = ("equipment_type", "situation")
    search_fields = ("name", "identification", "serial_number", "location")
    readonly_fields = ("created_at", "updated_at", "created_by")
    date_hierarchy = "next_calibration_date"


@admin.register(CalibrationCertificate)
class CalibrationCertificateAdmin(admin.ModelAdmin):
    list_display = ("certificate_number", "equipment", "issue_date", "validity_months", "created_at")
    list_filter = ("validity_months",)
    search_fields = ("certificate_number", "identification", "serial_number")
    readonly_fields = ("created_at", "uploaded_by", "raw_extracted_text")
