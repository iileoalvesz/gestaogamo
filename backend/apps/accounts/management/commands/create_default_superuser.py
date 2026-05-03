import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = "Cria superusuario padrao se nao existir"

    def handle(self, *args, **options):
        User = get_user_model()
        username = os.environ.get("DJANGO_SUPERUSER_USERNAME", "admin")
        email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "admin@gamon.com")
        password = os.environ.get("DJANGO_SUPERUSER_PASSWORD", "Gamon@2024")
        if User.objects.filter(username=username).exists():
            self.stdout.write(f"Superusuario ja existe: {username}")
            return
        User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            role="admin",
        )
        self.stdout.write(self.style.SUCCESS(f"Superusuario criado: {username}"))
