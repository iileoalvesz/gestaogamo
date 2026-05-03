from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_ADMIN = "admin"
    ROLE_ANALYST = "analyst"
    ROLE_CHOICES = [
        (ROLE_ADMIN, "Administrador"),
        (ROLE_ANALYST, "Analista"),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_ANALYST)
    full_name = models.CharField(max_length=300, blank=True)

    class Meta:
        verbose_name = "Usuário"
        verbose_name_plural = "Usuários"

    def __str__(self):
        return self.full_name or self.username

    @property
    def is_admin_role(self):
        return self.role == self.ROLE_ADMIN
