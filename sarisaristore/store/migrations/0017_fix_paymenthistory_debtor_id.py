"""
Repair migration — Ensures the debtor_id column exists on store_paymenthistory.

Migration 0016 created the PaymentHistory table but on the Railway Postgres
instance the debtor_id column is missing (migration was likely faked or the
DDL partially failed).  This migration uses RunPython so it can inspect
the schema first and is safe on both SQLite and PostgreSQL.
"""

from django.db import connection, migrations


def add_debtor_id_if_missing(apps, schema_editor):
    """Idempotently ensure debtor_id column exists on store_paymenthistory."""
    with connection.cursor() as cursor:
        # Introspect existing columns
        columns = [
            col.name
            for col in connection.introspection.get_table_description(cursor, 'store_paymenthistory')
        ]
        if 'debtor_id' in columns:
            return  # Nothing to do

        vendor = connection.vendor  # 'postgresql', 'sqlite', etc.

        cursor.execute(
            'ALTER TABLE store_paymenthistory ADD COLUMN debtor_id INTEGER;'
        )

        if vendor == 'postgresql':
            cursor.execute(
                'CREATE INDEX IF NOT EXISTS store_paymenthistory_debtor_id_idx '
                'ON store_paymenthistory (debtor_id);'
            )
            cursor.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint
                        WHERE conname = 'store_paymenthistory_debtor_id_key'
                    ) THEN
                        ALTER TABLE store_paymenthistory
                        ADD CONSTRAINT store_paymenthistory_debtor_id_key
                        UNIQUE (debtor_id);
                    END IF;
                END $$;
            """)
        else:
            # SQLite — index only (unique constraint already part of model)
            cursor.execute(
                'CREATE INDEX IF NOT EXISTS store_paymenthistory_debtor_id_idx '
                'ON store_paymenthistory (debtor_id);'
            )


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0016_paymenthistory'),
    ]

    operations = [
        migrations.RunPython(add_debtor_id_if_missing, migrations.RunPython.noop),
    ]
