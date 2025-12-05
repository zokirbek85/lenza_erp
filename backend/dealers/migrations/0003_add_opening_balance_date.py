# Generated migration for adding opening_balance_date and opening_balance_currency to Dealer model

from django.db import migrations, models
from django.utils import timezone


def set_default_opening_balance_dates(apps, schema_editor):
    """
    Set default opening_balance_date for existing dealers:
    - Use created_at date if available
    - Otherwise use today's date
    """
    Dealer = apps.get_model('dealers', 'Dealer')
    
    for dealer in Dealer.objects.all():
        if dealer.created_at:
            dealer.opening_balance_date = dealer.created_at.date()
        else:
            dealer.opening_balance_date = timezone.now().date()
        
        # Set default currency based on which balance is non-zero
        if dealer.opening_balance_usd != 0:
            dealer.opening_balance_currency = 'USD'
            dealer.opening_balance = dealer.opening_balance_usd
        elif dealer.opening_balance_uzs != 0:
            dealer.opening_balance_currency = 'UZS'
            dealer.opening_balance = dealer.opening_balance_uzs
        else:
            # Default to USD with 0 balance
            dealer.opening_balance_currency = 'USD'
            dealer.opening_balance = 0
        
        dealer.save(update_fields=['opening_balance_date', 'opening_balance_currency', 'opening_balance'])


class Migration(migrations.Migration):

    dependencies = [
        ('dealers', '0006_dealer_address_dealer_opening_balance_uzs_and_more'),
    ]

    operations = [
        # Add opening_balance_date field (nullable first)
        migrations.AddField(
            model_name='dealer',
            name='opening_balance_date',
            field=models.DateField(
                null=True,
                blank=True,
                help_text='Date when opening balance was set'
            ),
        ),
        # Add opening_balance_currency field (nullable first)
        migrations.AddField(
            model_name='dealer',
            name='opening_balance_currency',
            field=models.CharField(
                max_length=3,
                choices=[('USD', 'USD'), ('UZS', 'UZS')],
                default='USD',
                help_text='Currency of opening balance'
            ),
        ),
        # Add opening_balance field (unified amount)
        migrations.AddField(
            model_name='dealer',
            name='opening_balance',
            field=models.DecimalField(
                max_digits=18,
                decimal_places=2,
                default=0,
                help_text='Opening balance amount in opening_balance_currency'
            ),
        ),
        # Populate default dates and currency for existing dealers
        migrations.RunPython(
            set_default_opening_balance_dates,
            reverse_code=migrations.RunPython.noop
        ),
        # Make opening_balance_date non-nullable after populating
        migrations.AlterField(
            model_name='dealer',
            name='opening_balance_date',
            field=models.DateField(
                default=timezone.now,
                help_text='Date when opening balance was set'
            ),
        ),
    ]
