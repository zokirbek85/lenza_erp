from django.conf import settings
from django.db import migrations, models


def seed_regions(apps, schema_editor):
    Region = apps.get_model('dealers', 'Region')
    default_regions = [
        'Tashkent',
        'Samarkand',
        'Bukhara',
        'Fergana',
        'Namangan',
    ]
    for name in default_regions:
        Region.objects.get_or_create(name=name)


class Migration(migrations.Migration):

    dependencies = [
        ('dealers', '0003_region_remove_dealer_address_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='region',
            name='manager_user',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.deletion.SET_NULL,
                related_name='managed_regions',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RunPython(seed_regions, migrations.RunPython.noop),
    ]
