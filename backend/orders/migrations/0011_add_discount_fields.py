# Generated manually for discount feature

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0010_populate_order_exchange_rates'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='discount_type',
            field=models.CharField(
                choices=[
                    ('none', 'None'),
                    ('percentage', 'Percentage'),
                    ('amount', 'Fixed Amount')
                ],
                default='none',
                help_text='Type of discount applied to this order',
                max_length=20,
                verbose_name='Discount Type'
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='discount_value',
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text='Discount value: percentage (0-100) or fixed amount in USD',
                max_digits=12,
                verbose_name='Discount Value'
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='discount_amount_usd',
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text='Calculated discount amount in USD',
                max_digits=14,
                verbose_name='Discount Amount (USD)'
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='discount_amount_uzs',
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text='Calculated discount amount in UZS',
                max_digits=18,
                verbose_name='Discount Amount (UZS)'
            ),
        ),
    ]
