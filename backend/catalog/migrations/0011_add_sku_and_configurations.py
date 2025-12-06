# Generated migration for adding SKU and configurations to ProductVariant

from django.db import migrations, models


def generate_sku_for_existing_variants(apps, schema_editor):
    """Generate unique SKU for existing variants"""
    ProductVariant = apps.get_model('catalog', 'ProductVariant')
    ProductModel = apps.get_model('catalog', 'ProductModel')
    
    for idx, variant in enumerate(ProductVariant.objects.select_related('product_model').all(), start=1):
        try:
            # Get product model
            product_model = variant.product_model
            
            # Generate SKU from model, color, door_type
            model_name = product_model.model_name.replace(' ', '-')[:20] if product_model.model_name else 'MODEL'
            color = variant.color.replace(' ', '-')[:15] if variant.color else 'COLOR'
            door_type = variant.door_type if variant.door_type else 'TYPE'
            
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
        except Exception as e:
            # Fallback to simple numeric SKU if anything fails
            variant.sku = f"VARIANT-{variant.id}"
            variant.save(update_fields=['sku'])


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0010_add_door_kit_component'),
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
