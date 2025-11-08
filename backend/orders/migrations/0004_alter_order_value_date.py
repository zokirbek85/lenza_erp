from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0003_alter_order_options_remove_order_order_number_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='order',
            name='value_date',
            field=models.DateField(default=django.utils.timezone.localdate),
        ),
    ]
