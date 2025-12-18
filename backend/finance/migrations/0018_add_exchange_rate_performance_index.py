from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0016_rename_finance_exp_isglobal_is_active_idx_finance_exp_is_glob_83d151_idx'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            -- Create index for efficient exchange rate lookup by date (descending)
            CREATE INDEX IF NOT EXISTS idx_exchangerate_date_desc 
            ON finance_exchangerate (rate_date DESC);
            
            -- Create index for efficient lookup with date filter
            CREATE INDEX IF NOT EXISTS idx_exchangerate_date_asc 
            ON finance_exchangerate (rate_date);
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS idx_exchangerate_date_desc;
            DROP INDEX IF EXISTS idx_exchangerate_date_asc;
            """
        ),
    ]