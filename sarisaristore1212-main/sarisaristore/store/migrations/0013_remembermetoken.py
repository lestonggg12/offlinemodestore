from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0012_category_alter_dailysummary_best_seller_profit_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='RememberMeToken',
            fields=[
                ('id',         models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('token',      models.CharField(db_index=True, max_length=64, unique=True)),
                ('user_agent', models.CharField(blank=True, max_length=300)),
                ('ip_address', models.GenericIPAddressField(null=True, blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('last_used',  models.DateTimeField(auto_now=True)),
                ('user',       models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='remember_tokens',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name_plural': 'Remember Me Tokens',
            },
        ),
    ]
