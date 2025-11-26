# Generated manually for adding CashboxOpeningBalance model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0006_add_approval_workflow'),
    ]

    operations = [
        migrations.CreateModel(
            name='CashboxOpeningBalance',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('cashbox_type', models.CharField(choices=[('CARD', 'Card'), ('CASH_UZS', 'Cash UZS'), ('CASH_USD', 'Cash USD')], max_length=20, verbose_name='Cashbox Type')),
                ('balance', models.DecimalField(decimal_places=2, max_digits=18, verbose_name='Opening Balance')),
                ('currency', models.CharField(choices=[('USD', 'USD'), ('UZS', 'UZS')], max_length=3, verbose_name='Currency')),
                ('date', models.DateField(help_text='Date when this opening balance is set', verbose_name='Opening Date')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Cashbox Opening Balance',
                'verbose_name_plural': 'Cashbox Opening Balances',
                'ordering': ['-date', 'cashbox_type'],
            },
        ),
        migrations.AddIndex(
            model_name='cashboxopeningbalance',
            index=models.Index(fields=['-date'], name='payments_ca_date_idx'),
        ),
        migrations.AddIndex(
            model_name='cashboxopeningbalance',
            index=models.Index(fields=['cashbox_type'], name='payments_ca_cashbox_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='cashboxopeningbalance',
            unique_together={('cashbox_type', 'date')},
        ),
    ]
