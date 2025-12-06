# Generated migration for adding SKU and configurations to ProductVariant

from django.db import migrations, models


def generate_sku_for_existing_variants(apps, schema_editor):
    """Generate unique SKU for existing variants"""
    ProductVariant = apps.get_model('catalog', 'ProductVariant')
    
    for idx, variant in enumerate(ProductVariant.objects.all(), start=1):
        # Generate SKU from model, color, door_type
        model_name = variant.product_model.model_name.replace(' ', '-')[:20]
        color = variant.color.replace(' ', '-')[:15]
        door_type = variant.door_type
        
        # Create unique SKU
        base_sku = f"{model_name}-{door_type}-{color}".upper()
        sku = base_sku
        
        # Ensure uniqueness by adding counter if needed
        counter = 1
        while ProductVariant.objects.filter(sku=sku).exists():
            sku = f"{base_sku}-{counter}"
            counter += 1
        
        variant.sku = sku
        variant.save(update_fields=['sku'])


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0001_initial'),
    ]

    operations = [
        # Add SKU field as nullable first
        migrations.AddField(
            model_name='productvariant',
            name='sku',
            field=models.CharField(
                help_text='SKU/Артикул варианта',
                max_length=100,
                null=True,
                blank=True
            ),
        ),
        # Add configurations field
        migrations.AddField(
            model_name='productvariant',
            name='configurations',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Комплектация: [{'name': '...', 'value': '...'}]"
            ),
        ),
        # Generate SKUs for existing variants
        migrations.RunPython(
            generate_sku_for_existing_variants,
            reverse_code=migrations.RunPython.noop,
        ),
        # Make SKU required and unique
        migrations.AlterField(
            model_name='productvariant',
            name='sku',
            field=models.CharField(
                help_text='SKU/Артикул варианта',
                max_length=100,
                unique=True
            ),
        ),
    ]
