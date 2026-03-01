FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

ENV PYTHONPATH=/app:/app/sarisaristore

EXPOSE 8000
CMD ["gunicorn", "sarisaristore.wsgi:application", "--bind", "0.0.0.0:8000"]
```

**Note:** No `migrate` in the Dockerfile. Instead, in Railway → service → **Settings → Deploy → Release Command**, set:
```
python manage.py migrate