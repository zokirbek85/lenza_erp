# Generated manually on 2025-12-08

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0011_add_sku_and_configurations'),
    ]

    operations = [
        migrations.AlterField(
            model_name='productvariant',
            name='sku',
            field=models.CharField(blank=True, help_text='SKU/Артикул варианта', max_length=100, null=True, unique=True),
        ),
    ]
