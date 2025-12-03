from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CashSummaryView, FinanceAccountViewSet, FinanceTransactionViewSet

router = DefaultRouter()
router.register(r'accounts', FinanceAccountViewSet, basename='finance-account')
router.register(r'transactions', FinanceTransactionViewSet, basename='finance-transaction')

urlpatterns = [
    path('', include(router.urls)),
    path('summary/', CashSummaryView.as_view(), name='cash-summary'),
]
