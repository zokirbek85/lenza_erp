from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Roles(models.TextChoices):
        ADMIN = 'admin', 'Admin'
        ACCOUNTANT = 'accountant', 'Accountant'
        WAREHOUSE = 'warehouse', 'Warehouse'
        SALES = 'sales', 'Sales'
        OWNER = 'owner', 'Owner'

    role = models.CharField(max_length=20, choices=Roles.choices, default=Roles.SALES)
    otp_secret = models.CharField(max_length=64, blank=True)
    is_2fa_enabled = models.BooleanField(default=False)
    telegram_id = models.CharField(max_length=64, blank=True)

    def __str__(self) -> str:
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"
