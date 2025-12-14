# Generated migration for Defects V2 models
# All models prefixed with V2 to avoid conflicts

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('catalog', '0014_defecttype_remove_productmeta_collection_and_more'),
    ]

    operations = [
        # SparePartV2 model
        migrations.CreateModel(
            name='SparePartV2',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200, help_text='Friendly name for the spare part')),
                ('unit', models.CharField(max_length=20, default='dona', help_text='Unit of measurement')),
                ('min_stock_level', models.DecimalField(
                    max_digits=14,
                    decimal_places=2,
                    default=0,
                    help_text='Minimum stock level before alert'
                )),
                ('is_active', models.BooleanField(default=True, help_text='Whether this spare part is active')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('product', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    to='catalog.product',
                    related_name='spare_part_info',
                    help_text='Link to the product in catalog'
                )),
            ],
            options={
                'db_table': 'catalog_spare_part_v2',
                'verbose_name': 'Spare Part V2',
                'verbose_name_plural': 'Spare Parts V2',
                'ordering': ['name'],
            },
        ),

        # DefectBatchV2 model
        migrations.CreateModel(
            name='DefectBatchV2',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('total_qty', models.DecimalField(
                    max_digits=14,
                    decimal_places=2,
                    help_text='Total quantity of defective items in this batch'
                )),
                ('repairable_qty', models.DecimalField(
                    max_digits=14,
                    decimal_places=2,
                    default=0,
                    help_text='Quantity that can be repaired'
                )),
                ('non_repairable_qty', models.DecimalField(
                    max_digits=14,
                    decimal_places=2,
                    default=0,
                    help_text='Quantity that cannot be repaired (scrap/disposal)'
                )),
                ('status', models.CharField(
                    max_length=20,
                    choices=[
                        ('pending', 'Pending Inspection'),
                        ('inspected', 'Inspected'),
                        ('processing', 'Processing'),
                        ('completed', 'Completed'),
                    ],
                    default='pending',
                    help_text='Current status of the batch'
                )),
                ('detected_at', models.DateTimeField(default=django.utils.timezone.now, help_text='When defects were detected')),
                ('inspected_at', models.DateTimeField(null=True, blank=True, help_text='When batch was inspected')),
                ('completed_at', models.DateTimeField(null=True, blank=True, help_text='When batch processing was completed')),
                ('warehouse_name', models.CharField(max_length=200, blank=True, help_text='Warehouse name')),
                ('notes', models.TextField(blank=True, help_text='Additional notes about the defects')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('product', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    to='catalog.product',
                    related_name='defect_batches_v2',
                    help_text='Product with defects'
                )),
                ('created_by', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    to=settings.AUTH_USER_MODEL,
                    related_name='created_defect_batches_v2',
                    help_text='User who created this batch'
                )),
            ],
            options={
                'db_table': 'catalog_defect_batch_v2',
                'verbose_name': 'Defect Batch V2',
                'verbose_name_plural': 'Defect Batches V2',
                'ordering': ['-detected_at'],
            },
        ),

        # DefectDetailV2 model
        migrations.CreateModel(
            name='DefectDetailV2',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('qty', models.DecimalField(max_digits=14, decimal_places=2, help_text='Quantity with this defect type')),
                ('notes', models.TextField(blank=True, help_text='Additional notes about this defect')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('batch', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    to='catalog.defectbatchv2',
                    related_name='defect_details',
                    help_text='Batch this defect belongs to'
                )),
                ('defect_type', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    to='catalog.defecttype',
                    related_name='defect_occurrences_v2',
                    help_text='Type of defect'
                )),
            ],
            options={
                'db_table': 'catalog_defect_detail_v2',
                'verbose_name': 'Defect Detail V2',
                'verbose_name_plural': 'Defect Details V2',
                'ordering': ['-created_at'],
                'unique_together': {('batch', 'defect_type')},
            },
        ),

        # DefectRepairV2 model
        migrations.CreateModel(
            name='DefectRepairV2',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('qty_repaired', models.DecimalField(max_digits=14, decimal_places=2, help_text='Quantity repaired')),
                ('started_at', models.DateTimeField(default=django.utils.timezone.now, help_text='When repair started')),
                ('completed_at', models.DateTimeField(null=True, blank=True, help_text='When repair completed')),
                ('status', models.CharField(
                    max_length=20,
                    choices=[
                        ('pending', 'Pending'),
                        ('in_progress', 'In Progress'),
                        ('completed', 'Completed'),
                        ('failed', 'Failed'),
                    ],
                    default='pending',
                    help_text='Status of the repair'
                )),
                ('notes', models.TextField(blank=True, help_text='Repair notes')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('batch', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    to='catalog.defectbatchv2',
                    related_name='repairs',
                    help_text='Batch being repaired'
                )),
                ('performed_by', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    to=settings.AUTH_USER_MODEL,
                    related_name='defect_repairs_v2',
                    help_text='User who performed the repair'
                )),
            ],
            options={
                'db_table': 'catalog_defect_repair_v2',
                'verbose_name': 'Defect Repair V2',
                'verbose_name_plural': 'Defect Repairs V2',
                'ordering': ['-started_at'],
            },
        ),

        # RepairMaterialV2 model
        migrations.CreateModel(
            name='RepairMaterialV2',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('qty_used', models.DecimalField(max_digits=14, decimal_places=2, help_text='Quantity of spare part used')),
                ('unit_cost_usd', models.DecimalField(
                    max_digits=14,
                    decimal_places=2,
                    null=True,
                    blank=True,
                    help_text='Unit cost in USD'
                )),
                ('total_cost_usd', models.DecimalField(
                    max_digits=14,
                    decimal_places=2,
                    null=True,
                    blank=True,
                    help_text='Total cost (qty * unit_cost)'
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('repair', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    to='catalog.defectrepairv2',
                    related_name='materials',
                    help_text='Repair this material was used for'
                )),
                ('spare_part', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    to='catalog.sparepartv2',
                    related_name='usage_history',
                    help_text='Spare part used'
                )),
            ],
            options={
                'db_table': 'catalog_repair_material_v2',
                'verbose_name': 'Repair Material V2',
                'verbose_name_plural': 'Repair Materials V2',
                'ordering': ['-created_at'],
            },
        ),

        # DefectWriteOffV2 model
        migrations.CreateModel(
            name='DefectWriteOffV2',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('qty_written_off', models.DecimalField(max_digits=14, decimal_places=2, help_text='Quantity written off')),
                ('reason', models.CharField(
                    max_length=20,
                    choices=[
                        ('disposal', 'Disposal/Utilization'),
                        ('scrap', 'Scrap'),
                        ('outlet_sale', 'Outlet Sale'),
                    ],
                    help_text='Reason for write-off'
                )),
                ('performed_at', models.DateTimeField(default=django.utils.timezone.now, help_text='When write-off was performed')),
                ('notes', models.TextField(blank=True, help_text='Write-off notes')),
                ('sale_price_usd', models.DecimalField(
                    max_digits=14,
                    decimal_places=2,
                    null=True,
                    blank=True,
                    help_text='Sale price for outlet sales'
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('batch', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    to='catalog.defectbatchv2',
                    related_name='write_offs',
                    help_text='Batch being written off'
                )),
                ('performed_by', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    to=settings.AUTH_USER_MODEL,
                    related_name='defect_write_offs_v2',
                    help_text='User who performed the write-off'
                )),
            ],
            options={
                'db_table': 'catalog_defect_writeoff_v2',
                'verbose_name': 'Defect Write-Off V2',
                'verbose_name_plural': 'Defect Write-Offs V2',
                'ordering': ['-performed_at'],
            },
        ),

        # DefectAuditLogV2 model
        migrations.CreateModel(
            name='DefectAuditLogV2',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(
                    max_length=30,
                    choices=[
                        ('created', 'Batch Created'),
                        ('inspected', 'Batch Inspected'),
                        ('repair_started', 'Repair Started'),
                        ('repair_completed', 'Repair Completed'),
                        ('written_off', 'Written Off'),
                        ('status_changed', 'Status Changed'),
                    ],
                    help_text='Action performed'
                )),
                ('performed_at', models.DateTimeField(auto_now_add=True, help_text='When action was performed')),
                ('old_data', models.JSONField(null=True, blank=True, help_text='State before action')),
                ('new_data', models.JSONField(null=True, blank=True, help_text='State after action')),
                ('description', models.TextField(help_text='Human-readable description of the action')),
                ('batch', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    to='catalog.defectbatchv2',
                    related_name='audit_logs',
                    help_text='Batch this log entry is for'
                )),
                ('performed_by', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    to=settings.AUTH_USER_MODEL,
                    related_name='defect_audit_logs_v2',
                    help_text='User who performed the action'
                )),
            ],
            options={
                'db_table': 'catalog_defect_audit_log_v2',
                'verbose_name': 'Defect Audit Log V2',
                'verbose_name_plural': 'Defect Audit Logs V2',
                'ordering': ['-performed_at'],
            },
        ),

        # Add indexes
        migrations.AddIndex(
            model_name='defectbatchv2',
            index=models.Index(fields=['product', 'status'], name='idx_defect_batch_v2_prod_stat'),
        ),
        migrations.AddIndex(
            model_name='defectbatchv2',
            index=models.Index(fields=['detected_at'], name='idx_defect_batch_v2_detected'),
        ),
        migrations.AddIndex(
            model_name='defectrepairv2',
            index=models.Index(fields=['batch', 'status'], name='idx_repair_v2_batch_status'),
        ),
        migrations.AddIndex(
            model_name='defectwriteoffv2',
            index=models.Index(fields=['batch', 'reason'], name='idx_writeoff_v2_batch_reason'),
        ),
        migrations.AddIndex(
            model_name='defectauditlogv2',
            index=models.Index(fields=['batch', 'performed_at'], name='idx_audit_v2_batch_performed'),
        ),
    ]
