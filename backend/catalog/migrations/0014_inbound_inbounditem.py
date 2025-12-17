# Generated migration for Inbound and InboundItem models

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('catalog', '0013_remove_productmeta_collection_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='Inbound',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField(help_text='Date of product receipt', verbose_name='Inbound date')),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('confirmed', 'Confirmed')], default='draft', help_text='Document status', max_length=20, verbose_name='Status')),
                ('comment', models.TextField(blank=True, help_text='Optional notes about the inbound', verbose_name='Comment')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Created at')),
                ('confirmed_at', models.DateTimeField(blank=True, help_text='When the inbound was confirmed', null=True, verbose_name='Confirmed at')),
                ('brand', models.ForeignKey(help_text='Supplier from which products are received', on_delete=django.db.models.deletion.PROTECT, related_name='inbounds', to='catalog.brand', verbose_name='Supplier (Brand)')),
                ('created_by', models.ForeignKey(help_text='User who created the inbound document', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='inbounds', to=settings.AUTH_USER_MODEL, verbose_name='Created by')),
            ],
            options={
                'verbose_name': 'Inbound',
                'verbose_name_plural': 'Inbounds',
                'ordering': ('-created_at',),
            },
        ),
        migrations.CreateModel(
            name='InboundItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity', models.IntegerField(help_text='Quantity received', verbose_name='Quantity')),
                ('inbound', models.ForeignKey(help_text='Related inbound document', on_delete=django.db.models.deletion.CASCADE, related_name='items', to='catalog.inbound', verbose_name='Inbound')),
                ('product', models.ForeignKey(help_text='Product being received', on_delete=django.db.models.deletion.PROTECT, related_name='inbound_items', to='catalog.product', verbose_name='Product')),
            ],
            options={
                'verbose_name': 'Inbound Item',
                'verbose_name_plural': 'Inbound Items',
                'ordering': ('id',),
            },
        ),
        migrations.AddIndex(
            model_name='inbound',
            index=models.Index(fields=['-created_at'], name='catalog_inb_created_idx'),
        ),
        migrations.AddIndex(
            model_name='inbound',
            index=models.Index(fields=['date'], name='catalog_inb_date_idx'),
        ),
        migrations.AddIndex(
            model_name='inbound',
            index=models.Index(fields=['status'], name='catalog_inb_status_idx'),
        ),
        migrations.AddIndex(
            model_name='inbound',
            index=models.Index(fields=['brand', 'date'], name='catalog_inb_brand_d_idx'),
        ),
        migrations.AddIndex(
            model_name='inbounditem',
            index=models.Index(fields=['inbound'], name='catalog_inb_inbound_idx'),
        ),
        migrations.AddIndex(
            model_name='inbounditem',
            index=models.Index(fields=['product'], name='catalog_inb_product_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='inbounditem',
            unique_together={('inbound', 'product')},
        ),
    ]
