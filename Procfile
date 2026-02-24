release: python manage.py migrate
web: python manage.py migrate && gunicorn sarisaristore.wsgi:application