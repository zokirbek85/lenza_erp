from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from catalog.views import (
    BrandViewSet,
    CategoryViewSet,
    ProductExportExcelView,
    ProductImportExcelView,
    ProductImportTemplateView,
    ProductReportPDFView,
    ProductViewSet,
)
from core.views import AuditLogViewSet, SearchView, SystemBackupView, SystemConfigView
from dealers.views import (
    DealerBalancePDFView,
    DealerReconciliationPDFView,
    DealerReconciliationView,
    DealerViewSet,
    RegionViewSet,
)
from kpis.views import (
    AccountantKPIView,
    KPIRecordViewSet,
    OwnerKPIView,
    SalesManagerKPIView,
    WarehouseKPIView,
)
from notifications.views import NotificationViewSet
from orders.views import OrderExportExcelView, OrderViewSet
from orders.views_pdf import OrderInvoiceView, OrderSummaryPDFView
from payments.views import (
    CurrencyRateHistoryView,
    CurrencyRateViewSet,
    PaymentExportExcelView,
    PaymentReportPDFView,
    PaymentViewSet,
)
from users.auth import RoleAwareTokenObtainPairView
from users.views import UserViewSet
from users.views_2fa import TwoFactorSetupView, TwoFactorVerifyView

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')
router.register('dealers', DealerViewSet, basename='dealer')
router.register('regions', RegionViewSet, basename='region')
router.register('brands', BrandViewSet, basename='brand')
router.register('categories', CategoryViewSet, basename='category')
router.register('products', ProductViewSet, basename='product')
router.register('orders', OrderViewSet, basename='order')
router.register('payments', PaymentViewSet, basename='payment')
router.register('currency-rates', CurrencyRateViewSet, basename='currency-rate')
router.register('kpis', KPIRecordViewSet, basename='kpi')
router.register('notifications', NotificationViewSet, basename='notification')
router.register('audit', AuditLogViewSet, basename='audit')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', RoleAwareTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/orders/<int:pk>/invoice/', OrderInvoiceView.as_view(), name='order-invoice'),
    path('api/orders/<int:pk>/pdf/', OrderInvoiceView.as_view(), name='order-pdf'),
    path('api/orders/export/excel/', OrderExportExcelView.as_view(), name='orders-export-excel'),
    path('api/orders/report/pdf/', OrderSummaryPDFView.as_view(), name='orders-report-pdf'),
    path('api/products/export/excel/', ProductExportExcelView.as_view(), name='products-export-excel'),
    path('api/products/import/excel/', ProductImportExcelView.as_view(), name='products-import-excel'),
    path('api/products/import/template/', ProductImportTemplateView.as_view(), name='products-import-template'),
    path('api/catalog/export/excel/', ProductExportExcelView.as_view(), name='catalog-export-excel'),
    path('api/catalog/import/excel/', ProductImportExcelView.as_view(), name='catalog-import-excel'),
    path('api/catalog/report/pdf/', ProductReportPDFView.as_view(), name='catalog-report-pdf'),
    path('api/payments/report/pdf/', PaymentReportPDFView.as_view(), name='payments-report-pdf'),
    path('api/payments/export/excel/', PaymentExportExcelView.as_view(), name='payments-export-excel'),
    path('api/dealers/balance/pdf/', DealerBalancePDFView.as_view(), name='dealer-balance-pdf'),
    path('api/dealers/<int:pk>/reconciliation/', DealerReconciliationView.as_view(), name='dealer-reconciliation'),
    path('api/dealers/<int:pk>/reconciliation/pdf/', DealerReconciliationPDFView.as_view(), name='dealer-reconciliation-pdf'),
    path('api/payments/rates/history/', CurrencyRateHistoryView.as_view(), name='currency-rate-history'),
    path('api/system/config/', SystemConfigView.as_view(), name='system-config'),
    path('api/system/backup/', SystemBackupView.as_view(), name='system-backup'),
    path('api/kpis/owner/', OwnerKPIView.as_view(), name='kpi-owner'),
    path('api/kpis/warehouse/', WarehouseKPIView.as_view(), name='kpi-warehouse'),
    path('api/kpis/sales-manager/', SalesManagerKPIView.as_view(), name='kpi-sales-manager'),
    path('api/kpis/accountant/', AccountantKPIView.as_view(), name='kpi-accountant'),
    path('api/2fa/setup/', TwoFactorSetupView.as_view(), name='two-factor-setup'),
    path('api/2fa/verify/', TwoFactorVerifyView.as_view(), name='two-factor-verify'),
    path('api/search/', SearchView.as_view(), name='global-search'),
    path('api/', include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
