release: python manage.py migrate
web: gunicorn sarisaristore.sarisaristore.wsgi:application --bind 0.0.0.0:$PORT