from decimal import Decimal

import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0004_alter_product_stock_defect_alter_product_stock_ok'),
        ('dealers', '0005_add_debt_usd'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('returns', '0001_initial'),
    ]

    operations = [
        migrations.DeleteModel(
            name='ReturnItem',
        ),
        migrations.DeleteModel(
            name='Return',
        ),
        migrations.CreateModel(
            name='Return',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('general_comment', models.TextField(blank=True)),
                ('status', models.CharField(choices=[('confirmed', 'Confirmed')], default='confirmed', max_length=20)),
                ('total_sum', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=14)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_returns', to=settings.AUTH_USER_MODEL)),
                ('dealer', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='returns', to='dealers.dealer')),
            ],
            options={
                'ordering': ('-created_at',),
            },
        ),
        migrations.CreateModel(
            name='ReturnItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity', models.DecimalField(decimal_places=2, max_digits=12, validators=[django.core.validators.MinValueValidator(Decimal('0.01'))])),
                ('status', models.CharField(choices=[('healthy', 'Healthy'), ('defect', 'Defect')], default='healthy', max_length=20)),
                ('comment', models.CharField(blank=True, max_length=255)),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='catalog.product')),
                ('return_document', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='returns.return')),
            ],
            options={
                'unique_together': {('return_document', 'product')},
            },
        ),
    ]
