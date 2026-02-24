release: python manage.py migrate
web: gunicorn sarisaristore.wsgi --bind 0.0.0.0:$PORT
