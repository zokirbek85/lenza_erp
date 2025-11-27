# Generated migration to drop all expenses tables

from django.db import migrations, connection


def drop_expenses_tables(apps, schema_editor):
    """Drop expenses tables in a database-agnostic way"""
    with connection.cursor() as cursor:
        # Get database vendor (postgresql, sqlite, mysql, etc.)
        vendor = connection.vendor
        
        tables_to_drop = [
            'expenses_expense',
            'expenses_expensetype',
            'expenses_expensecategory',
        ]
        
        for table in tables_to_drop:
            try:
                if vendor == 'postgresql':
                    cursor.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
                else:
                    # SQLite doesn't support CASCADE
                    cursor.execute(f"DROP TABLE IF EXISTS {table}")
            except Exception as e:
                # Ignore errors if tables don't exist
                print(f"Could not drop {table}: {e}")


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0009_add_cashbox_description'),  # Latest payments migration
    ]

    operations = [
        migrations.RunPython(drop_expenses_tables, reverse_code=migrations.RunPython.noop),
    ]
