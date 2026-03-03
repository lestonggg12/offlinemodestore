#!/bin/bash
set -e
python manage.py collectstatic --noinput
python manage.py migrate
gunicorn sarisaristore.sarisaristore.wsgi:application --bind 0.0.0.0:$PORT