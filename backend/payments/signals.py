from django.db.models.signals import post_save, pre_save, pre_delete
from django.dispatch import receiver
from django.core.exceptions import ValidationError

from notifications.utils import push_global

from .models import CurrencyRate, Payment


