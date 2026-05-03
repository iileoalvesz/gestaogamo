from decimal import Decimal
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="SensorLocation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=200, verbose_name="Nome")),
                ("syos_nickname", models.CharField(help_text="Valor exato do campo 'Apelido do Módulo' na exportação SYOS", max_length=200, unique=True, verbose_name="Apelido no SYOS")),
                ("temp_standard", models.CharField(blank=True, max_length=50, verbose_name="Padrão T°C (ex: 1 à 7°C)")),
                ("min_temp", models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True, verbose_name="Temperatura Mínima Aceitável (°C)")),
                ("max_temp", models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True, verbose_name="Temperatura Máxima Aceitável (°C)")),
                ("meta_target", models.DecimalField(decimal_places=2, default=Decimal("0.85"), help_text="Ex: 0.85 = 85%", max_digits=4, verbose_name="Meta de Conformidade (%)")),
                ("is_active", models.BooleanField(default=True, verbose_name="Ativo")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"verbose_name": "Sensor", "verbose_name_plural": "Sensores", "ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="SensorImport",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("period_start", models.DateTimeField(verbose_name="Início do Período")),
                ("period_end", models.DateTimeField(verbose_name="Fim do Período")),
                ("import_status", models.CharField(choices=[("pending", "Processando"), ("done", "Concluído"), ("error", "Erro")], default="done", max_length=20, verbose_name="Status")),
                ("error_message", models.TextField(blank=True, verbose_name="Mensagem de Erro")),
                ("total_rows", models.IntegerField(default=0, verbose_name="Total de Linhas Importadas")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "imported_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"verbose_name": "Importação", "verbose_name_plural": "Importações", "ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="SensorReading",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("recorded_at", models.DateTimeField(verbose_name="Data/Hora")),
                ("temperature", models.DecimalField(decimal_places=2, max_digits=6, verbose_name="Temperatura °C")),
                ("is_ok", models.BooleanField(verbose_name="Dentro do Padrão")),
                (
                    "import_batch",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="readings",
                        to="sensors.sensorimport",
                    ),
                ),
                (
                    "sensor",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="readings",
                        to="sensors.sensorlocation",
                    ),
                ),
            ],
            options={"verbose_name": "Leitura", "verbose_name_plural": "Leituras", "ordering": ["sensor", "recorded_at"]},
        ),
        migrations.AddIndex(
            model_name="sensorreading",
            index=models.Index(fields=["sensor", "recorded_at"], name="sensors_sen_sensor__idx"),
        ),
        migrations.AddIndex(
            model_name="sensorreading",
            index=models.Index(fields=["import_batch"], name="sensors_sen_import__idx"),
        ),
    ]
