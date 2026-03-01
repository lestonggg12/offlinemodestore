release: python manage.py migrate
web: gunicorn sarisaristore.wsgi:application --bind 0.0.0.0:$PORT