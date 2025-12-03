# Generated manually for ExchangeRate model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0003_alter_financetransaction_amount_usd'),
    ]

    operations = [
        migrations.CreateModel(
            name='ExchangeRate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('rate_date', models.DateField(db_index=True, unique=True)),
                ('usd_to_uzs', models.DecimalField(decimal_places=2, help_text='Exchange rate: 1 USD = X UZS', max_digits=12)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Exchange Rate',
                'verbose_name_plural': 'Exchange Rates',
                'ordering': ('-rate_date',),
            },
        ),
    ]
