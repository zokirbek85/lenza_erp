from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from catalog.views import (
    BrandViewSet,
    CatalogView,
    CatalogExportPDFView,
    CatalogExportExcelView,
    CategoryViewSet,
    StyleViewSet,
    DealerProductsAPIView,
    ProductExportExcelView,
    ProductCatalogNoPricePDFView,
    ProductCatalogNoPriceExcelView,
    ProductImportExcelView,
    ProductImportTemplateView,
    ProductReportPDFView,
    ProductViewSet,
    # Marketing document generator views
    DealerCatalogPDFView,
    DealerCatalogExcelView,
    BrandCatalogPDFView,
    BrandCatalogExcelView,
    PriceListPDFView,
    PriceListExcelView,
    # Variant-based catalog views
    ProductModelViewSet,
    ProductVariantViewSet,
    ProductSKUViewSet,
    VariantCatalogViewSet,
    PublicVariantCatalogViewSet,
)
from dealers.views_list_all import DealerListAllView
from core.views import (
    AuditLogViewSet,
    CompanyInfoViewSet,
    DashboardSummaryView,
    DebtAnalyticsView,
    SearchView,
    SystemBackupView,
    SystemConfigView,
    TopDealersByAverageCheckView,
    UserManualViewSet,
    HealthCheckView,
)
from dealers.views import (
    DealerBalancePDFView,
    DealerExportExcelView,
    DealerExportPDFView,
    DealerImportExcelView,
    DealerImportTemplateView,
    DealerReconciliationExcelView,
    DealerReconciliationPDFView,
    DealerReconciliationView,
    DealerViewSet,
    RegionViewSet,
)
from returns.views import ReturnViewSet
from inventory.views import (
    AuditExportView,
    AuditImportView,
    InventoryAdjustmentViewSet,
    ReturnedProductStatsView,
    # ReturnedProductViewSet,
    ReturnsExportExcelView,
    ReturnsReportPDFView,
)
from kpis.views import (
    AccountantKPIView,
    CardKPIView,
    InventoryStatsView,
    KPIRecordViewSet,
    OwnerKPIView,
    SalesManagerKPIView,
    WarehouseKPIView,
    TopProductsAnalyticsView,
    RegionProductAnalyticsView,
    ProductTrendAnalyticsView,
    TopCategoriesAnalyticsView,
    TopDealersAnalyticsView,
    ManagerKPIOverviewView,
    KPILeaderboardView,
)
from notifications.views import NotificationViewSet
from orders.views import OrderExportExcelView, OrderImportTemplateView, OrderImportExcelView, OrderViewSet, OrderStatusStatAPIView
from orders.views_pdf import OrderInvoiceView, OrderSummaryPDFView
from users.auth import RoleAwareTokenObtainPairView
from users.views import TelegramLinkView, UserViewSet, DashboardLayoutView
from users.views_2fa import TwoFactorSetupView, TwoFactorVerifyView
# cards_pdf_report removed - depends on Payment model
from core.views_verify import verify_document
from core.views_verify_api import verify_order, verify_reconciliation

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')
router.register('dealers', DealerViewSet, basename='dealer')
router.register('regions', RegionViewSet, basename='region')
router.register('brands', BrandViewSet, basename='brand')
router.register('categories', CategoryViewSet, basename='category')
router.register('styles', StyleViewSet, basename='style')
router.register('products', ProductViewSet, basename='product')
router.register('orders', OrderViewSet, basename='order')
router.register('kpis', KPIRecordViewSet, basename='kpi')
router.register('notifications', NotificationViewSet, basename='notification')
router.register('audit', AuditLogViewSet, basename='audit')
router.register('company-info', CompanyInfoViewSet, basename='company-info')
router.register('returns', ReturnViewSet, basename='return')
router.register('inventory/adjustments', InventoryAdjustmentViewSet, basename='inventory-adjustment')
# Variant-based catalog routes
router.register('catalog/models', ProductModelViewSet, basename='product-model')
router.register('catalog/variants', VariantCatalogViewSet, basename='variant-catalog')
router.register('catalog/variants-detail', ProductVariantViewSet, basename='product-variant')
router.register('catalog/skus', ProductSKUViewSet, basename='product-sku')
# Public catalog (no auth required)
router.register('public/catalog/variants', PublicVariantCatalogViewSet, basename='public-catalog')
router.register('user-manuals', UserManualViewSet, basename='user-manual')

urlpatterns = [
    # Finance endpoints
    path('api/finance/', include('finance.urls')),
    path('admin/', admin.site.urls),
    path('api/token/', RoleAwareTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Dashboard summary
    path('api/dashboard/summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('api/dashboard/debt-analytics/', DebtAnalyticsView.as_view(), name='dashboard-debt-analytics'),
    path('api/dashboard/top-dealers-avg-check/', TopDealersByAverageCheckView.as_view(), name='dashboard-top-dealers-avg-check'),
    path('api/dashboard/layout/', DashboardLayoutView.as_view(), name='dashboard-layout'),
    path('api/health/', HealthCheckView.as_view(), name='health-check'),
    path('api/orders/<int:pk>/invoice/', OrderInvoiceView.as_view(), name='order-invoice'),

    path('api/orders/<int:pk>/pdf/', OrderInvoiceView.as_view(), name='order-pdf'),
    path('api/orders/status-stat/', OrderStatusStatAPIView.as_view(), name='orders-status-stat'),
    path('api/orders/export/excel/', OrderExportExcelView.as_view(), name='orders-export-excel'),
    path('api/orders/import/template/', OrderImportTemplateView.as_view(), name='orders-import-template'),
    path('api/orders/import/excel/', OrderImportExcelView.as_view(), name='orders-import-excel'),
    path('api/orders/report/pdf/', OrderSummaryPDFView.as_view(), name='orders-report-pdf'),
    path('api/telegram/link/', TelegramLinkView.as_view(), name='telegram-link'),
    path('api/products/export/excel/', ProductExportExcelView.as_view(), name='products-export-excel'),
    path('api/products/export/catalog/pdf/', ProductCatalogNoPricePDFView.as_view(), name='products-catalog-no-price-pdf'),
    path('api/products/export/catalog/excel/', ProductCatalogNoPriceExcelView.as_view(), name='products-catalog-no-price-excel'),
    path('api/products/import/excel/', ProductImportExcelView.as_view(), name='products-import-excel'),
    path('api/products/import/template/', ProductImportTemplateView.as_view(), name='products-import-template'),
    path('api/dealers/<int:dealer_id>/products/', DealerProductsAPIView.as_view(), name='dealer-products'),
    path('api/catalog/', CatalogView.as_view(), name='catalog'),
    path('api/catalog/export/pdf/', CatalogExportPDFView.as_view(), name='catalog-export-pdf'),
    path('api/catalog/export/excel/', CatalogExportExcelView.as_view(), name='catalog-export-excel'),
    # Marketing document generator endpoints
    path('api/marketing/dealer-catalog/pdf/', DealerCatalogPDFView.as_view(), name='marketing-dealer-catalog-pdf'),
    path('api/marketing/dealer-catalog/excel/', DealerCatalogExcelView.as_view(), name='marketing-dealer-catalog-excel'),
    path('api/marketing/brand-catalog/pdf/', BrandCatalogPDFView.as_view(), name='marketing-brand-catalog-pdf'),
    path('api/marketing/brand-catalog/excel/', BrandCatalogExcelView.as_view(), name='marketing-brand-catalog-excel'),
    path('api/marketing/pricelist/pdf/', PriceListPDFView.as_view(), name='marketing-pricelist-pdf'),
    path('api/marketing/pricelist/excel/', PriceListExcelView.as_view(), name='marketing-pricelist-excel'),
    # Cards report removed - depends on Payment model
    # Explicit mapping for orders report action (monthly report PDF/XLSX/JSON via ?format=)
    path('api/orders/report/', OrderViewSet.as_view({'get': 'report'}), name='orders-report'),
    path('api/orders/report', OrderViewSet.as_view({'get': 'report'})),
    path('api/dealers/balance/pdf/', DealerBalancePDFView.as_view(), name='dealer-balance-pdf'),
    path('api/dealers/export/excel/', DealerExportExcelView.as_view(), name='dealers-export-excel'),
    path('api/dealers/export/pdf/', DealerExportPDFView.as_view(), name='dealers-export-pdf'),
    path('api/dealers/import/excel/', DealerImportExcelView.as_view(), name='dealers-import-excel'),
    path('api/dealers/import/template/', DealerImportTemplateView.as_view(), name='dealers-import-template'),
    path('api/dealers/<int:pk>/reconciliation/', DealerReconciliationView.as_view(), name='dealer-reconciliation'),
    path('api/dealers/<int:pk>/reconciliation/pdf/', DealerReconciliationPDFView.as_view(), name='dealer-reconciliation-pdf'),
    path('api/dealers/<int:pk>/reconciliation/excel/', DealerReconciliationExcelView.as_view(), name='dealer-reconciliation-excel'),
    # Non-paginated dealer list for dropdowns
    path('api/dealers/list-all/', DealerListAllView.as_view(), name='dealer-list-all'),
    path('api/system/config/', SystemConfigView.as_view(), name='system-config'),
    path('api/system/backup/', SystemBackupView.as_view(), name='system-backup'),
    path('api/kpis/owner/', OwnerKPIView.as_view(), name='kpi-owner'),
    path('api/kpis/warehouse/', WarehouseKPIView.as_view(), name='kpi-warehouse'),
    path('api/kpis/sales-manager/', SalesManagerKPIView.as_view(), name='kpi-sales-manager'),
    path('api/kpis/accountant/', AccountantKPIView.as_view(), name='kpi-accountant'),
    path('api/kpi/cards/', CardKPIView.as_view(), name='kpi-cards'),
    path('api/kpi/inventory-stats/', InventoryStatsView.as_view(), name='kpi-inventory-stats'),
    # NEW: Manager KPI Module
    path('api/kpi/manager/<int:manager_id>/overview/', ManagerKPIOverviewView.as_view(), name='manager-kpi-overview'),
    path('api/kpi/leaderboard/', KPILeaderboardView.as_view(), name='kpi-leaderboard'),
    # Sales Analytics endpoints
    path('api/analytics/top-products/', TopProductsAnalyticsView.as_view(), name='analytics-top-products'),
    path('api/analytics/region-products/', RegionProductAnalyticsView.as_view(), name='analytics-region-products'),
    path('api/analytics/product-trend/', ProductTrendAnalyticsView.as_view(), name='analytics-product-trend'),
    path('api/analytics/top-categories/', TopCategoriesAnalyticsView.as_view(), name='analytics-top-categories'),
    path('api/analytics/top-dealers/', TopDealersAnalyticsView.as_view(), name='analytics-top-dealers'),
    path('api/returns/export/pdf/', ReturnsReportPDFView.as_view(), name='returns-export-pdf'),
    path('api/returns/export/excel/', ReturnsExportExcelView.as_view(), name='returns-export-excel'),
    path('api/returns/stats/', ReturnedProductStatsView.as_view(), name='returns-stats'),
    # Inventory audit endpoints
    path('api/inventory/audit/export/', AuditExportView.as_view(), name='inventory-audit-export'),
    path('api/inventory/audit/import/', AuditImportView.as_view(), name='inventory-audit-import'),
    path('api/2fa/setup/', TwoFactorSetupView.as_view(), name='two-factor-setup'),
    path('api/2fa/verify/', TwoFactorVerifyView.as_view(), name='two-factor-verify'),
    path('api/search/', SearchView.as_view(), name='global-search'),
    path('api/', include(router.urls)),
    # QR verification endpoints (public, no auth required)
    path('api/verify/order/<int:id>/', verify_order, name='verify-order-api'),
    path('api/verify/reconciliation/<int:id>/', verify_reconciliation, name='verify-reconciliation-api'),
    # Legacy HTML verification endpoint
    path('verify/<str:doc_type>/<slug:doc_id>/', verify_document, name='verify-document'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)