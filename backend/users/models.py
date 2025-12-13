from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from datetime import timedelta


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
    last_seen = models.DateTimeField(null=True, blank=True, help_text='Last activity timestamp')

    def __str__(self) -> str:
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"

    @property
    def is_online(self) -> bool:
        """User is considered online if last_seen is within the last 5 minutes"""
        if not self.last_seen:
            return False
        return timezone.now() - self.last_seen < timedelta(minutes=5)


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
