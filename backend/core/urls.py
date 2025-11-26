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
    UserManualViewSet,
    HealthCheckView,
)
from dealers.views import (
    DealerBalancePDFView,
    DealerExportExcelView,
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
)
from notifications.views import NotificationViewSet
from orders.views import OrderExportExcelView, OrderImportTemplateView, OrderImportExcelView, OrderViewSet
from orders.views_pdf import OrderInvoiceView, OrderSummaryPDFView
from payments.views import (
    CashboxOpeningBalanceViewSet,
    CashboxSummaryView,
    CurrencyRateHistoryView,
    CurrencyRateViewSet,
    PaymentCardViewSet,
    PaymentExportExcelView,
    PaymentReportPDFView,
    PaymentViewSet,
)
from expenses.views import ExpenseViewSet, ExpenseTypeViewSet
from expenses.report_view import MonthlyExpenseReportView
from expenses.views_export import (
    ExpenseListExcelExportView,
    ExpenseListPDFExportView,
    LegacyExpenseExportView,
    MonthlyExpenseExcelExportView,
    MonthlyExpensePDFExportView,
)
from ledger.views import LedgerSummaryView, CardBalanceView, LedgerByCardView, LedgerByCategoryView, LedgerBalanceWidgetView
from ledger.views_export import ledger_export_view
from users.auth import RoleAwareTokenObtainPairView
from users.views import TelegramLinkView, UserViewSet
from users.views_2fa import TwoFactorSetupView, TwoFactorVerifyView
from reports.views_cards_pdf import cards_pdf_report
from core.views_verify import verify_document

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')
router.register('dealers', DealerViewSet, basename='dealer')
router.register('regions', RegionViewSet, basename='region')
router.register('brands', BrandViewSet, basename='brand')
router.register('categories', CategoryViewSet, basename='category')
router.register('products', ProductViewSet, basename='product')
router.register('orders', OrderViewSet, basename='order')
router.register('payments', PaymentViewSet, basename='payment')
router.register('payment-cards', PaymentCardViewSet, basename='payment-card')
router.register('expenses', ExpenseViewSet, basename='expense')
router.register('expense-types', ExpenseTypeViewSet, basename='expense-type')
# Ledger - dynamic API (no model, no ViewSet)
router.register('currency-rates', CurrencyRateViewSet, basename='currency-rate')
router.register('cashbox-opening-balances', CashboxOpeningBalanceViewSet, basename='cashbox-opening-balance')
router.register('kpis', KPIRecordViewSet, basename='kpi')
router.register('notifications', NotificationViewSet, basename='notification')
router.register('audit', AuditLogViewSet, basename='audit')
router.register('company-info', CompanyInfoViewSet, basename='company-info')
router.register('returns', ReturnViewSet, basename='return')
router.register('user-manuals', UserManualViewSet, basename='user-manual')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', RoleAwareTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Dashboard summary
    path('api/dashboard/summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('api/dashboard/debt-analytics/', DebtAnalyticsView.as_view(), name='dashboard-debt-analytics'),
    path('api/health/', HealthCheckView.as_view(), name='health-check'),
    # Cashbox summary
    path('api/cashbox/summary/', CashboxSummaryView.as_view(), name='cashbox-summary'),
    path('api/expenses/export/pdf/', ExpenseListPDFExportView.as_view(), name='expense-export-pdf'),
    path('api/expenses/export/pdf', ExpenseListPDFExportView.as_view()),
    path('api/expenses/export/excel/', ExpenseListExcelExportView.as_view(), name='expense-export-excel'),
    path('api/expenses/export/excel', ExpenseListExcelExportView.as_view()),
    path('api/expenses/export/', LegacyExpenseExportView.as_view(), name='expense-export'),
    path('api/orders/<int:pk>/invoice/', OrderInvoiceView.as_view(), name='order-invoice'),
    path('api/orders/<int:pk>/pdf/', OrderInvoiceView.as_view(), name='order-pdf'),
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
    path('api/payments/report/pdf/', PaymentReportPDFView.as_view(), name='payments-report-pdf'),
    path('api/reports/cards/pdf/', cards_pdf_report, name='cards-pdf-report'),
    path('api/payments/export/excel/', PaymentExportExcelView.as_view(), name='payments-export-excel'),
    # Explicit mapping for payments export action (PDF/XLSX via ?format=)
    path('api/payments/export/', PaymentViewSet.as_view({'get': 'export'}), name='payments-export'),
    path('api/payments/export', PaymentViewSet.as_view({'get': 'export'})),
    # Explicit mapping for payments report action (monthly report PDF/XLSX/JSON via ?format=)
    path('api/payments/report/', PaymentViewSet.as_view({'get': 'report'}), name='payments-report'),
    path('api/payments/report', PaymentViewSet.as_view({'get': 'report'})),
    # Ledger export - standalone function-based view
    path('api/ledger/export/', ledger_export_view, name='ledger-export'),
    # Ledger - dynamic balance calculator (no model, no ViewSet)
    path('api/ledger/', LedgerSummaryView.as_view(), name='ledger-summary'),
    path('api/ledger/by-card/', LedgerByCardView.as_view(), name='ledger-by-card'),
    path('api/ledger/by-category/', LedgerByCategoryView.as_view(), name='ledger-by-category'),
    path('api/ledger-accounts/balances/', LedgerBalanceWidgetView.as_view(), name='ledger-balances'),
    path('api/cards/<int:card_id>/balance/', CardBalanceView.as_view(), name='card-balance'),
    # Explicit mapping for orders report action (monthly report PDF/XLSX/JSON via ?format=)
    path('api/orders/report/', OrderViewSet.as_view({'get': 'report'}), name='orders-report'),
    path('api/orders/report', OrderViewSet.as_view({'get': 'report'})),
    path('api/dealers/balance/pdf/', DealerBalancePDFView.as_view(), name='dealer-balance-pdf'),
    path('api/dealers/export/excel/', DealerExportExcelView.as_view(), name='dealers-export-excel'),
    path('api/dealers/import/excel/', DealerImportExcelView.as_view(), name='dealers-import-excel'),
    path('api/dealers/import/template/', DealerImportTemplateView.as_view(), name='dealers-import-template'),
    path('api/dealers/<int:pk>/reconciliation/', DealerReconciliationView.as_view(), name='dealer-reconciliation'),
    path('api/dealers/<int:pk>/reconciliation/pdf/', DealerReconciliationPDFView.as_view(), name='dealer-reconciliation-pdf'),
    path('api/dealers/<int:pk>/reconciliation/excel/', DealerReconciliationExcelView.as_view(), name='dealer-reconciliation-excel'),
    # Non-paginated dealer list for dropdowns
    path('api/dealers/list-all/', DealerListAllView.as_view(), name='dealer-list-all'),
    path('api/payments/rates/history/', CurrencyRateHistoryView.as_view(), name='currency-rate-history'),
    path('api/expenses/report/', MonthlyExpenseReportView.as_view(), name='expenses-report'),
    path('api/expenses/report', MonthlyExpenseReportView.as_view()),
    path('api/expenses/monthly/export/pdf/', MonthlyExpensePDFExportView.as_view(), name='expense-monthly-export-pdf'),
    path('api/expenses/monthly/export/pdf', MonthlyExpensePDFExportView.as_view()),
    path('api/expenses/monthly/export/excel/', MonthlyExpenseExcelExportView.as_view(), name='expense-monthly-export-excel'),
    path('api/expenses/monthly/export/excel', MonthlyExpenseExcelExportView.as_view()),
    path('api/system/config/', SystemConfigView.as_view(), name='system-config'),
    path('api/system/backup/', SystemBackupView.as_view(), name='system-backup'),
    path('api/kpis/owner/', OwnerKPIView.as_view(), name='kpi-owner'),
    path('api/kpis/warehouse/', WarehouseKPIView.as_view(), name='kpi-warehouse'),
    path('api/kpis/sales-manager/', SalesManagerKPIView.as_view(), name='kpi-sales-manager'),
    path('api/kpis/accountant/', AccountantKPIView.as_view(), name='kpi-accountant'),
    path('api/kpi/cards/', CardKPIView.as_view(), name='kpi-cards'),
    path('api/kpi/inventory-stats/', InventoryStatsView.as_view(), name='kpi-inventory-stats'),
    path('api/returns/export/pdf/', ReturnsReportPDFView.as_view(), name='returns-export-pdf'),
    path('api/returns/export/excel/', ReturnsExportExcelView.as_view(), name='returns-export-excel'),
    path('api/returns/stats/', ReturnedProductStatsView.as_view(), name='returns-stats'),
    path('api/2fa/setup/', TwoFactorSetupView.as_view(), name='two-factor-setup'),
    path('api/2fa/verify/', TwoFactorVerifyView.as_view(), name='two-factor-verify'),
    path('api/search/', SearchView.as_view(), name='global-search'),
    path('api/', include(router.urls)),
    # QR verification endpoint
    path('verify/<str:doc_type>/<slug:doc_id>/', verify_document, name='verify-document'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
