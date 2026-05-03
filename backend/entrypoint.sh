#!/bin/sh
set -e

echo "==> Aplicando migrations..."
python manage.py migrate --no-input

echo "==> Coletando arquivos estaticos..."
python manage.py collectstatic --no-input

echo "==> Criando superusuario (se nao existir)..."
python manage.py create_default_superuser

echo "==> Iniciando Gunicorn..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 1 \
    --timeout 180 \
    --log-level info
