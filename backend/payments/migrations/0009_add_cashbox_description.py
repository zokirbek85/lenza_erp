from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0008_cashbox_alter_cashboxopeningbalance_options_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='cashbox',
            name='description',
            field=models.TextField(blank=True, default='', verbose_name='Izoh'),
        ),
    ]
