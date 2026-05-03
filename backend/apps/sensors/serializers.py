from rest_framework import serializers
from .models import SensorLocation, SensorImport, SensorReading


class SensorLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SensorLocation
        fields = (
            "id", "name", "syos_nickname", "temp_standard",
            "min_temp", "max_temp", "meta_target", "is_active",
        )


class SensorImportSerializer(serializers.ModelSerializer):
    imported_by_name = serializers.CharField(
        source="imported_by.full_name", read_only=True, default=""
    )

    class Meta:
        model = SensorImport
        fields = (
            "id", "period_start", "period_end", "import_status",
            "error_message", "total_rows", "imported_by_name", "created_at",
        )
        read_only_fields = ("id", "import_status", "error_message", "total_rows", "created_at")


class SensorReadingSerializer(serializers.ModelSerializer):
    sensor_name = serializers.CharField(source="sensor.name", read_only=True)

    class Meta:
        model = SensorReading
        fields = ("id", "sensor", "sensor_name", "recorded_at", "temperature", "is_ok")


class SensorSummarySerializer(serializers.Serializer):
    sensor_id     = serializers.IntegerField()
    name          = serializers.CharField()
    syos_nickname = serializers.CharField()
    temp_standard = serializers.CharField()
    min_temp      = serializers.DecimalField(max_digits=6, decimal_places=2, allow_null=True)
    max_temp      = serializers.DecimalField(max_digits=6, decimal_places=2, allow_null=True)
    meta_target   = serializers.DecimalField(max_digits=4, decimal_places=2)
    total_readings = serializers.IntegerField()
    ok_readings   = serializers.IntegerField()
    compliance_pct = serializers.FloatField()
    min_recorded  = serializers.FloatField(allow_null=True)
    max_recorded  = serializers.FloatField(allow_null=True)
    avg_recorded  = serializers.FloatField(allow_null=True)
