from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='BotUser',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('chat_id', models.BigIntegerField(unique=True)),
                ('full_name', models.CharField(blank=True, max_length=255)),
                ('role',
                 models.CharField(
                     choices=[
                         ('admin', 'Admin'),
                         ('accountant', 'Buxgalter'),
                         ('warehouse', 'Omborchi'),
                         ('sales', 'Sotuv menejeri'),
                     ],
                     max_length=50,
                 )),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ('-created_at',),
            },
        ),
    ]
