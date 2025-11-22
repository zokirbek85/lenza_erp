from decimal import Decimal

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dealers', '0004_region_manager_user'),
    ]

    operations = [
        migrations.AddField(
            model_name='dealer',
            name='debt_usd',
            field=models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=14),
        ),
    ]
