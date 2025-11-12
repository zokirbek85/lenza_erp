from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model


class ExportEndpointsSmokeTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        User = get_user_model()
        self.user = User.objects.create_user(
            username="owner",
            password="pass1234",
            role="owner",
            is_active=True,
        )
        self.client.force_authenticate(user=self.user)

    def assert_pdf(self, url: str):
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200, msg=f"{url} status={res.status_code} body={getattr(res, 'data', None)}")
        self.assertEqual(res["Content-Type"], "application/pdf")
        self.assertIn("attachment; filename=", res["Content-Disposition"])  # all exports should be attachments

    def assert_xlsx(self, url: str):
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200, msg=f"{url} status={res.status_code}")
        self.assertIn("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", res["Content-Type"])  # MIME
        self.assertIn("attachment; filename=", res["Content-Disposition"])  # attachment header

    def test_expenses_export_pdf_xlsx(self):
        self.assert_pdf("/api/expenses/export/?format=pdf")
        self.assert_xlsx("/api/expenses/export/?format=xlsx")

    def test_expenses_report_pdf_xlsx(self):
        """Monthly expenses report by type with ?month=YYYY-MM&format=pdf|xlsx"""
        self.assert_pdf("/api/expenses/report/?month=2025-11&format=pdf")
        self.assert_xlsx("/api/expenses/report/?month=2025-11&format=xlsx")

    def test_ledger_export_pdf_xlsx(self):
        # use explicit routes we mapped
        self.assert_pdf("/api/ledger-entries/export/?format=pdf")
        self.assert_xlsx("/api/ledger-entries/export/?format=xlsx")
    
    def test_ledger_report_pdf_xlsx(self):
        """Monthly ledger report with ?month=YYYY-MM&format=pdf|xlsx"""
        self.assert_pdf("/api/ledger-entries/report/?month=2025-11&format=pdf")
        self.assert_xlsx("/api/ledger-entries/report/?month=2025-11&format=xlsx")

    def test_payments_export_pdf_xlsx(self):
        self.assert_pdf("/api/payments/export/?format=pdf")
        self.assert_xlsx("/api/payments/export/?format=xlsx")
    
    def test_payments_report_pdf_xlsx(self):
        """Monthly payments report with ?month=YYYY-MM&format=pdf|xlsx"""
        self.assert_pdf("/api/payments/report/?month=2025-11&format=pdf")
        self.assert_xlsx("/api/payments/report/?month=2025-11&format=xlsx")
    
    def test_orders_report_pdf_xlsx(self):
        """Monthly orders report with ?month=YYYY-MM&format=pdf|xlsx"""
        self.assert_pdf("/api/orders/report/?month=2025-11&format=pdf")
        self.assert_xlsx("/api/orders/report/?month=2025-11&format=xlsx")

    def test_orders_summary_pdf(self):
        self.assert_pdf("/api/orders/report/pdf/")

    def test_catalog_products_report_pdf(self):
        self.assert_pdf("/api/catalog/report/pdf/")

    def test_returns_export_pdf(self):
        self.assert_pdf("/api/returns/export/pdf/")

