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

    class ArchiveReasons(models.TextChoices):
        TERMINATED = 'terminated', 'Ishdan bo\'shatilgan'
        REPLACED = 'replaced', 'Almashtirilgan'
        RESIGNED = 'resigned', 'O\'zi ketgan'
        OTHER = 'other', 'Boshqa sabab'

    role = models.CharField(max_length=20, choices=Roles.choices, default=Roles.SALES)
    otp_secret = models.CharField(max_length=64, blank=True)
    is_2fa_enabled = models.BooleanField(default=False)
    telegram_id = models.CharField(max_length=64, blank=True)
    last_seen = models.DateTimeField(null=True, blank=True, help_text='Last activity timestamp')
    archived_at = models.DateTimeField(null=True, blank=True, help_text='When user was archived')
    archived_reason = models.CharField(
        max_length=20, 
        choices=ArchiveReasons.choices, 
        null=True, 
        blank=True,
        help_text='Reason for archiving'
    )

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


class UserReplacement(models.Model):
    """Audit log for user replacements - preserves history of manager changes."""
    old_user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='replaced_from',
        help_text='User being replaced'
    )
    new_user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='replaced_to',
        help_text='Replacement user'
    )
    replacement_date = models.DateField(default=timezone.now, help_text='Effective date of replacement')
    replaced_at = models.DateTimeField(auto_now_add=True, help_text='When replacement occurred')
    replaced_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='replacements_performed',
        help_text='Admin who performed the replacement'
    )
    comment = models.TextField(blank=True, help_text='Reason or notes for replacement')

    class Meta:
        db_table = 'users_replacement'
        verbose_name = 'User Replacement'
        verbose_name_plural = 'User Replacements'
        ordering = ['-replaced_at']

    def __str__(self) -> str:
        return f"{self.old_user.username} → {self.new_user.username} ({self.replaced_at.strftime('%Y-%m-%d')})"

