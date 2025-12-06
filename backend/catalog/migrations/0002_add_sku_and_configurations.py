# Generated migration for adding SKU and configurations to ProductVariant

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='productvariant',
            name='sku',
            field=models.CharField(
                default='TEMP-SKU',
                help_text='SKU/Артикул варианта',
                max_length=100,
                unique=True
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='productvariant',
            name='configurations',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Комплектация: [{'name': '...', 'value': '...'}]"
            ),
        ),
    ]
