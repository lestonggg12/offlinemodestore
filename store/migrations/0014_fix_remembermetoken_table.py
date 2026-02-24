from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('store', '0013_remembermetoken'),
    ]

    operations = [
        migrations.RunSQL(
            """
            CREATE TABLE IF NOT EXISTS "store_remembermetoken" (
                "id" bigserial NOT NULL PRIMARY KEY,
                "token" varchar(64) NOT NULL UNIQUE,
                "user_agent" varchar(300) NOT NULL,
                "ip_address" inet NULL,
                "created_at" timestamp with time zone NOT NULL,
                "last_used" timestamp with time zone NOT NULL,
                "user_id" integer NOT NULL REFERENCES "auth_user" ("id") ON DELETE CASCADE
            );
            """,
            reverse_sql='DROP TABLE IF EXISTS "store_remembermetoken";'
        ),
    ]