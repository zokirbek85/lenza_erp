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


class DashboardLayout(models.Model):
    """Stores user's customized dashboard widget layout for drag & drop functionality."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='dashboard_layout')
    layout = models.JSONField(default=list, help_text='Array of widget positions: [{i, x, y, w, h}, ...]')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users_dashboard_layout'
        verbose_name = 'Dashboard Layout'
        verbose_name_plural = 'Dashboard Layouts'

    def __str__(self) -> str:
        return f"Dashboard layout for {self.user.username}"
