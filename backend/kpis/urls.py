from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    KPIRecordViewSet,
    OwnerKPIView,
    WarehouseKPIView,
    SalesManagerKPIView,
    SalesManagerKPIDetailView,
    AccountantKPIView,
    CardKPIView,
    InventoryStatsView,
    TopProductsAnalyticsView,
    RegionProductAnalyticsView,
    BrandAnalyticsView,
    CategoryAnalyticsView,
    DealerPerformanceView,
    SalesPerformanceByDealerView,
    SalesPerformanceByRegionView,
    WeeklySalesTrendView,
    MonthlySalesTrendView,
    ManagerKPIOverviewView,
    KPILeaderboardView,
)

router = DefaultRouter()
router.register(r'records', KPIRecordViewSet, basename='kpirecord')

urlpatterns = [
    path('', include(router.urls)),
    
    # Role-based KPI views
    path('owner/', OwnerKPIView.as_view(), name='owner-kpi'),
    path('warehouse/', WarehouseKPIView.as_view(), name='warehouse-kpi'),
    path('sales-manager/', SalesManagerKPIView.as_view(), name='sales-manager-kpi'),
    path('sales-manager/detail/', SalesManagerKPIDetailView.as_view(), name='sales-manager-kpi-detail'),
    path('accountant/', AccountantKPIView.as_view(), name='accountant-kpi'),
    path('card/', CardKPIView.as_view(), name='card-kpi'),
    
    # Inventory & Analytics
    path('inventory/stats/', InventoryStatsView.as_view(), name='inventory-stats'),
    path('analytics/top-products/', TopProductsAnalyticsView.as_view(), name='top-products'),
    path('analytics/region-products/', RegionProductAnalyticsView.as_view(), name='region-products'),
    path('analytics/brands/', BrandAnalyticsView.as_view(), name='brand-analytics'),
    path('analytics/categories/', CategoryAnalyticsView.as_view(), name='category-analytics'),
    
    # Performance views
    path('performance/dealers/', DealerPerformanceView.as_view(), name='dealer-performance'),
    path('performance/sales/by-dealer/', SalesPerformanceByDealerView.as_view(), name='sales-by-dealer'),
    path('performance/sales/by-region/', SalesPerformanceByRegionView.as_view(), name='sales-by-region'),
    path('performance/weekly-trend/', WeeklySalesTrendView.as_view(), name='weekly-trend'),
    path('performance/monthly-trend/', MonthlySalesTrendView.as_view(), name='monthly-trend'),
    
    # NEW: Manager KPI Module
    path('manager/<int:manager_id>/overview/', ManagerKPIOverviewView.as_view(), name='manager-kpi-overview'),
    path('leaderboard/', KPILeaderboardView.as_view(), name='kpi-leaderboard'),
]
