# Generated manually to create missing ProductDefect and DefectAuditLog tables
# These models were defined in migration 0014 but tables were never created

from django.db import migrations


def create_tables(apps, schema_editor):
    """Create ProductDefect and DefectAuditLog tables if they don't exist"""
    from django.db import connection

    # Check if tables already exist
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name IN ('catalog_productdefect', 'catalog_defectauditlog')
        """ if connection.vendor == 'sqlite' else """
            SELECT tablename FROM pg_tables
            WHERE schemaname='public' AND tablename IN ('catalog_productdefect', 'catalog_defectauditlog')
        """)
        existing_tables = {row[0] for row in cursor.fetchall()}

    # Get the model classes
    ProductDefect = apps.get_model('catalog', 'ProductDefect')
    DefectAuditLog = apps.get_model('catalog', 'DefectAuditLog')

    # Create tables if they don't exist
    with schema_editor.connection.schema_editor() as editor:
        if 'catalog_productdefect' not in existing_tables:
            editor.create_model(ProductDefect)

        if 'catalog_defectauditlog' not in existing_tables:
            editor.create_model(DefectAuditLog)


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0016_create_defecttype_table'),
    ]

    operations = [
        migrations.RunPython(create_tables, migrations.RunPython.noop),
    ]
