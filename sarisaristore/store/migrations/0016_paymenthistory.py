from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0015_sale_customer_name'),
    ]

    operations = [
        migrations.CreateModel(
            name='PaymentHistory',
            fields=[
                ('id',            models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('debtor_id',     models.IntegerField(db_index=True, unique=True)),
                ('date_paid',     models.DateField(db_index=True)),
                ('customer_name', models.CharField(max_length=200)),
                ('total_amount',  models.DecimalField(decimal_places=2, max_digits=12)),
                ('items_json',    models.TextField(blank=True, default='[]')),
                ('expires_at',    models.DateField()),
                ('created_at',    models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name_plural': 'Payment History',
                'ordering': ['-date_paid', '-created_at'],
            },
        ),
    ]
