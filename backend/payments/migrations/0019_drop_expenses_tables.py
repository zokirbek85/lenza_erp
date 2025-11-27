# Generated migration to drop all expenses tables

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0009_add_cashbox_description'),  # Latest payments migration
    ]

    operations = [
        # Drop expenses tables if they exist
        migrations.RunSQL(
            sql="""
            DROP TABLE IF EXISTS expenses_expense CASCADE;
            DROP TABLE IF EXISTS expenses_expensetype CASCADE;
            DROP TABLE IF EXISTS expenses_expensecategory CASCADE;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
