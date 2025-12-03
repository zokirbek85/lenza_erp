# Generated manually

from django.db import migrations


def create_default_accounts(apps, schema_editor):
    """Create default Cash accounts"""
    FinanceAccount = apps.get_model('finance', 'FinanceAccount')
    
    # Cash UZS
    FinanceAccount.objects.get_or_create(
        type='cash',
        currency='UZS',
        name='Cash UZS',
        defaults={'is_active': True}
    )
    
    # Cash USD
    FinanceAccount.objects.get_or_create(
        type='cash',
        currency='USD',
        name='Cash USD',
        defaults={'is_active': True}
    )


def reverse_seed(apps, schema_editor):
    """Remove default accounts"""
    FinanceAccount = apps.get_model('finance', 'FinanceAccount')
    FinanceAccount.objects.filter(
        type='cash',
        name__in=['Cash UZS', 'Cash USD']
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_default_accounts, reverse_seed),
    ]
