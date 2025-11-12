from django.contrib import admin

from .models import ExpenseType, Expense


@admin.register(ExpenseType)
class ExpenseTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active")
    search_fields = ("name",)
    list_filter = ("is_active",)
    ordering = ("name",)


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = (
        "date",
        "type",
        "method",
        "card",
        "currency",
        "amount",
        "status",
        "created_by",
        "approved_by",
    )
    list_filter = ("date", "type", "method", "currency", "status")
    search_fields = ("comment", "type__name", "card__name")
    date_hierarchy = "date"
    ordering = ("-date", "-created_at")
    list_select_related = ("type", "card", "created_by", "approved_by")
    readonly_fields = ("created_at", "approved_at")
