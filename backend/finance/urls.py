from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CashSummaryView,
    CurrencyTransferView,
    ExchangeRateViewSet,
    FinanceAccountViewSet,
    FinanceTransactionViewSet,
)

router = DefaultRouter()
router.register(r'accounts', FinanceAccountViewSet, basename='finance-account')
router.register(r'transactions', FinanceTransactionViewSet, basename='finance-transaction')
router.register(r'exchange-rates', ExchangeRateViewSet, basename='exchange-rate')

urlpatterns = [
    path('', include(router.urls)),
    path('summary/', CashSummaryView.as_view(), name='cash-summary'),
    path('transfer-currency/', CurrencyTransferView.as_view(), name='transfer-currency'),
]
