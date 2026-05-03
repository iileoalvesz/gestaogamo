#!/bin/sh
set -e

echo "==> Aplicando migrations..."
python manage.py migrate --no-input

echo "==> Coletando arquivos estáticos..."
python manage.py collectstatic --no-input

echo "==> Criando superusuário (se não existir)..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
username = '${DJANGO_SUPERUSER_USERNAME:-admin}'
if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(
        username=username,
        email='${DJANGO_SUPERUSER_EMAIL:-admin@gamon.com}',
        password='${DJANGO_SUPERUSER_PASSWORD:-Gamon@2024}',
        role='admin',
    )
    print('Superusuário criado:', username)
else:
    print('Superusuário já existe:', username)
"

echo "==> Iniciando Gunicorn..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 1 \
    --timeout 180 \
    --log-level info
