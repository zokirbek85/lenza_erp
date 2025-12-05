# Generated manually for variant-based catalog refactor

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0008_collection_doorcolor_doormodel_productmeta'),
    ]

    operations = [
        # First, drop all old tables
        migrations.RunSQL(
            sql="""
            PRAGMA foreign_keys = OFF;
            DROP TABLE IF EXISTS catalog_productmeta;
            DROP TABLE IF EXISTS catalog_doormodel;
            DROP TABLE IF EXISTS catalog_doorcolor;
            DROP TABLE IF EXISTS catalog_collection;
            PRAGMA foreign_keys = ON;
            """,
            reverse_sql="""
            -- Cannot reverse this migration
            """
        ),
        
        # Create new ProductModel table
        migrations.CreateModel(
            name='ProductModel',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('collection', models.CharField(help_text='Коллекция (Эмалит, Вертикаль, 50001/50002)', max_length=200)),
                ('model_name', models.CharField(help_text='Название модели (Бета Софт, Имидж Эмалит белый)', max_length=200)),
                ('preview_image', models.ImageField(blank=True, help_text='Превью модели', null=True, upload_to='catalog/models/')),
                ('description', models.TextField(blank=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('brand', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='product_models', to='catalog.brand')),
            ],
            options={
                'verbose_name': 'Модель продукта',
                'verbose_name_plural': 'Модели продуктов',
                'ordering': ['brand', 'collection', 'model_name'],
                'unique_together': {('brand', 'collection', 'model_name')},
            },
        ),
        
        # Create new ProductVariant table
        migrations.CreateModel(
            name='ProductVariant',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('color', models.CharField(help_text='Цвет (тач-серый, белый, жасмин)', max_length=150)),
                ('door_type', models.CharField(
                    choices=[
                        ('ПГ', 'ПГ (Полотно глухое)'),
                        ('ПО', 'ПО (Полотно остекленное)'),
                        ('ПДО', 'ПДО (Полотно деглухое остекленное)'),
                        ('ПДГ', 'ПДГ (Полотно деглухое глухое)')
                    ],
                    help_text='Тип дверного полотна',
                    max_length=10
                )),
                ('image', models.ImageField(blank=True, help_text='Изображение варианта', null=True, upload_to='catalog/variants/')),
                ('description', models.TextField(blank=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('product_model', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='variants', to='catalog.productmodel')),
            ],
            options={
                'verbose_name': 'Вариант продукта',
                'verbose_name_plural': 'Варианты продуктов',
                'ordering': ['product_model', 'color', 'door_type'],
                'unique_together': {('product_model', 'color', 'door_type')},
            },
        ),
        
        # Add index for ProductVariant
        migrations.AddIndex(
            model_name='productvariant',
            index=models.Index(fields=['product_model', 'is_active'], name='catalog_pro_product_70dc21_idx'),
        ),
        
        # Create new ProductSKU table
        migrations.CreateModel(
            name='ProductSKU',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('size', models.CharField(
                    choices=[
                        ('400мм', '400мм'),
                        ('600мм', '600мм'),
                        ('700мм', '700мм'),
                        ('800мм', '800мм'),
                        ('900мм', '900мм'),
                        ('20-6', '20-6 (600мм)'),
                        ('20-7', '20-7 (700мм)'),
                        ('20-8', '20-8 (800мм)'),
                        ('20-9', '20-9 (900мм)'),
                        ('21-6', '21-6 (600мм)'),
                        ('21-7', '21-7 (700мм)'),
                        ('21-8', '21-8 (800мм)'),
                        ('21-9', '21-9 (900мм)'),
                        ('other', 'Другой размер')
                    ],
                    help_text='Размер дверного полотна',
                    max_length=20
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('product', models.OneToOneField(
                    help_text='Связь с существующим продуктом ERP',
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='sku',
                    to='catalog.product'
                )),
                ('variant', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='skus',
                    to='catalog.productvariant'
                )),
            ],
            options={
                'verbose_name': 'SKU продукта',
                'verbose_name_plural': 'SKU продуктов',
                'ordering': ['variant', 'size'],
                'unique_together': {('variant', 'size')},
            },
        ),
        
        # Add indexes for ProductSKU
        migrations.AddIndex(
            model_name='productsku',
            index=models.Index(fields=['variant', 'size'], name='catalog_pro_variant_0d35cb_idx'),
        ),
        migrations.AddIndex(
            model_name='productsku',
            index=models.Index(fields=['product'], name='catalog_pro_product_dc3f47_idx'),
        ),
    ]
