# Generated migration for FinanceAccount opening balance feature

from decimal import Decimal
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0005_add_amount_uzs_to_transaction'),
    ]

    operations = [
        migrations.AddField(
            model_name='financeaccount',
            name='opening_balance_amount',
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal('0'),
                help_text='Opening balance amount',
                max_digits=18
            ),
        ),
        migrations.AddField(
            model_name='financeaccount',
            name='opening_balance_date',
            field=models.DateField(
                blank=True,
                help_text='Opening balance date (required if amount > 0)',
                null=True
            ),
        ),
        migrations.AlterField(
            model_name='financetransaction',
            name='type',
            field=models.CharField(
                choices=[
                    ('income', 'Income'),
                    ('expense', 'Expense'),
                    ('opening_balance', 'Opening Balance')
                ],
                max_length=20
            ),
        ),
    ]
