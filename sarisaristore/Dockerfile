FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

ENV PYTHONPATH=/app:/app/sarisistore
ENV DJANGO_SETTINGS_MODULE=settings

EXPOSE 8000

CMD ["gunicorn", "sarisistore.wsgi:application", "--bind", "0.0.0.0:8000"]