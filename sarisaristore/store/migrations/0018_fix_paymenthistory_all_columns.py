"""
Repair migration (part 2) — Adds ALL missing columns to store_paymenthistory.

Migration 0017 only repaired debtor_id. This migration ensures every column
from the model definition exists in the actual database table.
"""

from django.db import connection, migrations


EXPECTED_COLUMNS = [
    ('debtor_id',     'INTEGER',                       ''),
    ('date_paid',     'DATE',                          "DEFAULT '2000-01-01'"),
    ('customer_name', 'VARCHAR(200)',                   "DEFAULT ''"),
    ('total_amount',  'NUMERIC(12,2)',                  'DEFAULT 0'),
    ('items_json',    'TEXT',                           "DEFAULT '[]'"),
    ('expires_at',    'DATE',                           "DEFAULT '2000-01-01'"),
    ('created_at',    'TIMESTAMP WITH TIME ZONE',       ''),
]

SQLITE_TYPE_OVERRIDES = {
    'NUMERIC(12,2)':                'REAL',
    'TIMESTAMP WITH TIME ZONE':     'DATETIME',
}


def repair_paymenthistory(apps, schema_editor):
    with connection.cursor() as cursor:
        existing = {
            col.name
            for col in connection.introspection.get_table_description(
                cursor, 'store_paymenthistory'
            )
        }
        vendor = connection.vendor

        for col_name, col_type, default_clause in EXPECTED_COLUMNS:
            if col_name in existing:
                continue
            if vendor != 'postgresql':
                col_type = SQLITE_TYPE_OVERRIDES.get(col_type, col_type)
            parts = [
                'ALTER TABLE store_paymenthistory ADD COLUMN',
                col_name, col_type,
            ]
            if default_clause:
                parts.append(default_clause)
            cursor.execute(' '.join(parts) + ';')

        if vendor == 'postgresql':
            cursor.execute(
                'CREATE INDEX IF NOT EXISTS store_paymenthistory_debtor_id_idx '
                'ON store_paymenthistory (debtor_id);'
            )
            cursor.execute(
                'CREATE INDEX IF NOT EXISTS store_paymenthistory_date_paid_idx '
                'ON store_paymenthistory (date_paid);'
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


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0017_fix_paymenthistory_debtor_id'),
    ]

    operations = [
        migrations.RunPython(repair_paymenthistory, migrations.RunPython.noop),
    ]
