import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sensors", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="RpaJobLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("trigger", models.CharField(
                    choices=[("scheduler", "Agendado (automático)"), ("manual", "Manual")],
                    default="manual",
                    max_length=20,
                    verbose_name="Origem",
                )),
                ("period_start", models.DateField(blank=True, null=True, verbose_name="Início do Período")),
                ("period_end", models.DateField(blank=True, null=True, verbose_name="Fim do Período")),
                ("started_at", models.DateTimeField(auto_now_add=True, verbose_name="Iniciado em")),
                ("finished_at", models.DateTimeField(blank=True, null=True, verbose_name="Finalizado em")),
                ("status", models.CharField(
                    choices=[("running", "Em execução"), ("done", "Concluído"), ("error", "Erro")],
                    default="running",
                    max_length=20,
                    verbose_name="Status",
                )),
                ("message", models.TextField(blank=True, verbose_name="Mensagem")),
                ("total_rows", models.IntegerField(blank=True, null=True, verbose_name="Linhas importadas")),
                ("triggered_by", models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    to=settings.AUTH_USER_MODEL,
                    verbose_name="Usuário",
                )),
            ],
            options={
                "verbose_name": "Execução RPA",
                "verbose_name_plural": "Execuções RPA",
                "ordering": ["-started_at"],
            },
        ),
    ]
