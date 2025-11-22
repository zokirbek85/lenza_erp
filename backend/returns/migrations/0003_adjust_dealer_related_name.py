from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('returns', '0002_return_rework'),
        ('dealers', '0005_add_debt_usd'),
    ]

    operations = [
        migrations.AlterField(
            model_name='return',
            name='dealer',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='return_documents', to='dealers.dealer'),
        ),
    ]
