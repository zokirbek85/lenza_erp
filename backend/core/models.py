from django.db import models


class CompanyInfo(models.Model):
    name = models.CharField(max_length=255)
    slogan = models.CharField(max_length=255, blank=True, null=True)
    logo = models.ImageField(upload_to='company/', blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    bank_name = models.CharField(max_length=255, blank=True, null=True)
    account_number = models.CharField(max_length=100, blank=True, null=True)
    inn = models.CharField(max_length=50, blank=True, null=True)
    mfo = models.CharField(max_length=50, blank=True, null=True)
    director = models.CharField(max_length=255, blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Company Info'
        verbose_name_plural = 'Company Info'

    def __str__(self) -> str:
        return self.name or 'Company Info'


class UserManual(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('director', 'Director'),
        ('accountant', 'Accountant'),
        ('warehouse', 'Warehouse'),
        ('sales', 'Sales Manager'),
    ]

    title = models.CharField(max_length=255)
    content = models.TextField()
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-created_at',)

    def __str__(self) -> str:
        return f"{self.title} ({self.role})"
