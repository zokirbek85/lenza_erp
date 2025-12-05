# Generated manually - Add DoorKitComponent model

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0009_drop_old_catalog_create_variant'),
    ]

    operations = [
        # Create DoorKitComponent model
        migrations.CreateModel(
            name='DoorKitComponent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity', models.DecimalField(decimal_places=2, help_text='Количество на 1 дверь (например, 2.50)', max_digits=5, verbose_name='Количество')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('component', models.ForeignKey(help_text='Погонаж: наличник, коробка, добор и т.д.', on_delete=django.db.models.deletion.PROTECT, to='catalog.product', verbose_name='Компонент')),
                ('variant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='kit_components', to='catalog.productvariant', verbose_name='Вариант двери')),
            ],
            options={
                'verbose_name': 'Комплектующий элемент двери',
                'verbose_name_plural': 'Комплектующие элементы двери',
                'ordering': ['variant', 'component'],
            },
        ),
        
        # Add index
        migrations.AddIndex(
            model_name='doorkitcomponent',
            index=models.Index(fields=['variant'], name='catalog_doo_variant_27590d_idx'),
        ),
    ]
