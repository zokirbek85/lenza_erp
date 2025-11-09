from django.db import models


class BotUser(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('accountant', 'Buxgalter'),
        ('warehouse', 'Omborchi'),
        ('sales', 'Sotuv menejeri'),
    ]

    chat_id = models.BigIntegerField(unique=True)
    full_name = models.CharField(max_length=255, blank=True)
    role = models.CharField(max_length=50, choices=ROLE_CHOICES)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-created_at',)

    def __str__(self) -> str:
        return f'{self.full_name or self.chat_id} ({self.role})'
