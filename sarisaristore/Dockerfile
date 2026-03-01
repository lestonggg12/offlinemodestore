FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

ENV PYTHONPATH=/app:/app/sarisaristore
ENV DJANGO_SETTINGS_MODULE=sarisaristore.settings

EXPOSE 8000
CMD ["gunicorn", "sarisaristore.wsgi:application", "--bind", "0.0.0.0:8000"]
```

## And in Railway → service → Settings → Release Command:
```
python manage.py migrate
```

## Also add these Railway environment variables:
Go to Railway → **Variables** and add:
```
DJANGO_SECRET_KEY=bf9e1c219bbc7978256f3f8723265a7a
DEBUG=False
ALLOWED_HOSTS=.railway.app