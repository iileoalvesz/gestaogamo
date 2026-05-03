#!/bin/sh
set -e

echo "==> Aplicando migrations..."
python manage.py migrate --no-input

echo "==> Coletando arquivos estáticos..."
python manage.py collectstatic --no-input

echo "==> Criando superusuário (se não existir)..."
python manage.py shell << 'EOF'
from django.contrib.auth import get_user_model
User = get_user_model()
import os
username = os.environ.get("DJANGO_SUPERUSER_USERNAME", "admin")
email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "admin@gamon.com")
password = os.environ.get("DJANGO_SUPERUSER_PASSWORD", "Gamon@2024")
if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username=username, email=email, password=password, role="admin")
    print("Superusuario criado:", username)
else:
    print("Superusuario ja existe:", username)
EOF

echo "==> Iniciando Gunicorn..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 1 \
    --timeout 180 \
    --log-level info
