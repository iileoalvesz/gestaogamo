from rest_framework import serializers
from .models import Equipment, CalibrationCertificate, EquipmentType


class CalibrationCertificateSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source="uploaded_by.full_name", read_only=True, default="")

    class Meta:
        model = CalibrationCertificate
        fields = (
            "id",
            "certificate_number",
            "issue_date",
            "validity_months",
            "requestor",
            "material_type",
            "manufacturer",
            "model",
            "serial_number",
            "identification",
            "measurement_range",
            "resolution",
            "calibration_status",
            "pdf_file",
            "uploaded_by_name",
            "created_at",
        )
        read_only_fields = ("id", "created_at", "uploaded_by_name")


class EquipmentSerializer(serializers.ModelSerializer):
    status = serializers.CharField(read_only=True)
    days_until_expiration = serializers.IntegerField(read_only=True)
    equipment_type_display = serializers.CharField(source="get_equipment_type_display", read_only=True)
    situation_display = serializers.CharField(source="get_situation_display", read_only=True)
    latest_certificate = serializers.SerializerMethodField()

    class Meta:
        model = Equipment
        fields = (
            "id",
            "equipment_type",
            "equipment_type_display",
            "name",
            "location",
            "model",
            "identification",
            "serial_number",
            "certificate_number",
            "calibration_frequency_days",
            "last_calibration_date",
            "next_calibration_date",
            "situation",
            "situation_display",
            "status",
            "days_until_expiration",
            "certificate_file",
            "latest_certificate",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "status", "days_until_expiration", "created_at", "updated_at")

    def get_latest_certificate(self, obj):
        cert = obj.certificates.order_by("-created_at").first()
        if cert:
            return CalibrationCertificateSerializer(cert, context=self.context).data
        return None


class EquipmentDetailSerializer(EquipmentSerializer):
    certificates = CalibrationCertificateSerializer(many=True, read_only=True)

    class Meta(EquipmentSerializer.Meta):
        fields = EquipmentSerializer.Meta.fields + ("certificates",)


class CertificateUploadSerializer(serializers.Serializer):
    pdf_file = serializers.FileField()
    equipment_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_pdf_file(self, value):
        if not value.name.lower().endswith(".pdf"):
            raise serializers.ValidationError("Apenas arquivos PDF são aceitos.")
        return value


class DashboardSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    em_dia = serializers.IntegerField()
    a_vencer = serializers.IntegerField()
    vencido = serializers.IntegerField()
    sem_data = serializers.IntegerField()
    inativos = serializers.IntegerField()
    by_type = serializers.DictField()
