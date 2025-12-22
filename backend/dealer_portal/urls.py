"""
URL configuration for dealer portal.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'orders', views.DealerOrderViewSet, basename='dealer-orders')
router.register(r'payments', views.DealerPaymentViewSet, basename='dealer-payments')
router.register(r'returns', views.DealerReturnViewSet, basename='dealer-returns')
router.register(r'refunds', views.DealerRefundViewSet, basename='dealer-refunds')

urlpatterns = [
    # Authentication
    path('login/', views.dealer_login, name='dealer-login'),
    path('logout/', views.dealer_logout, name='dealer-logout'),
    path('profile/', views.dealer_profile, name='dealer-profile'),

    # Reconciliation (Akt Sverka)
    path('reconciliation/', views.dealer_reconciliation, name='dealer-reconciliation'),
    path('reconciliation/pdf/', views.dealer_reconciliation_pdf, name='dealer-reconciliation-pdf'),

    # API endpoints
    path('', include(router.urls)),
]
