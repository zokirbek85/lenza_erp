"""
Reconciliation (Akt Sverka) Document Generator.

Generates professional reconciliation statements with:
- Opening balance
- Orders list
- Returns list
- Payments list
- Closing balance
- Date, description, amount, running balance for each transaction
"""

from decimal import Decimal
from typing import Any, Dict, List, Optional
from datetime import date

from .base import BaseDocument, DocumentStyle


class ReconciliationDocument(BaseDocument):
    """
    Professional reconciliation (akt sverka) document generator.
    
    Usage:
        data = get_reconciliation_data(dealer_id=1, from_date='2025-01-01', to_date='2025-12-31')
        recon = ReconciliationDocument(data=data)
        return recon.get_response(filename='reconciliation.pdf')
    """
    
    template_name = 'documents/reconciliation.html'
    document_type = 'reconciliation'
    
    def __init__(
        self,
        *,
        data: Dict[str, Any],
        show_detailed: bool = True,
        **kwargs
    ):
        """
        Initialize reconciliation document.
        
        Args:
            data: Reconciliation data from service
            show_detailed: Show detailed transaction list
            **kwargs: Additional args for BaseDocument
        """
        super().__init__(**kwargs)
        self.data = data
        self.show_detailed = show_detailed
    
    def _build_transaction_list(self) -> List[Dict[str, Any]]:
        """Build unified transaction list with running balance."""
        transactions = []
        balance = Decimal(str(self.data['opening_balance']))
        
        # Add opening balance
        transactions.append({
            'date': self.data['from_date'],
            'type': 'opening',
            'description': 'Opening Balance',
            'debit': None,
            'credit': None,
            'balance': balance,
            'balance_formatted': self.format_currency(balance, 'USD'),
        })
        
        # Collect all transactions
        all_items = []
        
        # Orders
        for order in self.data.get('orders', []):
            all_items.append({
                'date': order['date'],
                'type': 'order',
                'description': f"Order #{order['order_no']}",
                'amount': Decimal(str(order['amount_usd'])),
                'is_debit': True,
            })
        
        # Returns
        for ret in self.data.get('returns', []):
            all_items.append({
                'date': ret['date'],
                'type': 'return',
                'description': f"Return (Order #{ret.get('order_no', '—')})",
                'amount': Decimal(str(ret['amount_usd'])),
                'is_debit': False,
            })
        
        # Payments
        for payment in self.data.get('payments', []):
            all_items.append({
                'date': payment['date'],
                'type': 'payment',
                'description': f"Payment ({payment.get('method', 'Cash')})",
                'amount': Decimal(str(payment['amount_usd'])),
                'is_debit': False,
            })
        
        # Sort by date
        all_items.sort(key=lambda x: x['date'])
        
        # Calculate running balance
        for item in all_items:
            if item['is_debit']:
                balance += item['amount']
                debit = item['amount']
                credit = None
            else:
                balance -= item['amount']
                debit = None
                credit = item['amount']
            
            transactions.append({
                'date': item['date'],
                'type': item['type'],
                'description': item['description'],
                'debit': self.format_currency(debit, 'USD') if debit else '—',
                'credit': self.format_currency(credit, 'USD') if credit else '—',
                'balance': balance,
                'balance_formatted': self.format_currency(balance, 'USD'),
            })
        
        return transactions
    
    def get_summary_data(self) -> Dict[str, Any]:
        """Get summary totals."""
        return {
            'opening_balance': Decimal(str(self.data['opening_balance'])),
            'total_orders': Decimal(str(self.data['totals']['orders'])),
            'total_returns': Decimal(str(self.data['totals']['returns'])),
            'total_payments': Decimal(str(self.data['totals']['payments'])),
            'closing_balance': Decimal(str(self.data['closing_balance'])),
        }
    
    def get_context(self) -> Dict[str, Any]:
        """Get template context for reconciliation."""
        context = super().get_context()
        
        summary = self.get_summary_data()
        transactions = self._build_transaction_list()
        
        context.update({
            'dealer': self.data['dealer'],
            'from_date': self.data['from_date'],
            'to_date': self.data['to_date'],
            'transactions': transactions,
            'summary': summary,
            'show_detailed': self.show_detailed,
            # Formatted values
            'opening_balance_fmt': self.format_currency(summary['opening_balance'], 'USD'),
            'total_orders_fmt': self.format_currency(summary['total_orders'], 'USD'),
            'total_returns_fmt': self.format_currency(summary['total_returns'], 'USD'),
            'total_payments_fmt': self.format_currency(summary['total_payments'], 'USD'),
            'closing_balance_fmt': self.format_currency(summary['closing_balance'], 'USD'),
        })
        
        return context


class ReconciliationTemplate:
    """HTML template for reconciliation."""
    
    @staticmethod
    def get_html() -> str:
        return '''
{% load tz i18n %}
<!DOCTYPE html>
<html lang="{{ language|default:'uz' }}">
<head>
    <meta charset="utf-8" />
    <style>
        {{ base_css }}
        
        /* Reconciliation specific styles */
        .recon-header {
            text-align: center;
            margin-bottom: 32px;
        }
        
        .recon-title {
            font-size: 24px;
            font-weight: 700;
            color: {{ style.PRIMARY }};
            margin-bottom: 8px;
        }
        
        .recon-period {
            font-size: 14px;
            color: {{ style.TEXT_MUTED }};
        }
        
        .dealer-info {
            background: #f0f9ff;
            border-radius: {{ style.BORDER_RADIUS }};
            padding: 16px 20px;
            margin-bottom: 28px;
            border-left: 4px solid {{ style.ACCENT }};
        }
        
        .dealer-name {
            font-size: 18px;
            font-weight: 700;
            color: {{ style.PRIMARY }};
        }
        
        .balance-summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 12px;
            margin-bottom: 28px;
        }
        
        .balance-card {
            padding: 12px 16px;
            border-radius: {{ style.BORDER_RADIUS }};
            border: 1px solid {{ style.BORDER }};
            background: white;
        }
        
        .balance-card.positive {
            border-left: 4px solid {{ style.SUCCESS }};
        }
        
        .balance-card.negative {
            border-left: 4px solid {{ style.ERROR }};
        }
        
        .balance-label {
            font-size: {{ style.FONT_SIZE_SMALL }};
            color: {{ style.TEXT_MUTED }};
            margin-bottom: 4px;
        }
        
        .balance-value {
            font-size: 16px;
            font-weight: 700;
        }
        
        .transaction-row {
            transition: background 0.2s;
        }
        
        .transaction-row.type-opening {
            background: #f0f9ff !important;
            font-weight: 600;
        }
        
        .transaction-row.type-order {
            background: #fef3c7 !important;
        }
        
        .transaction-row.type-payment {
            background: #d1fae5 !important;
        }
        
        .transaction-row.type-return {
            background: #fee2e2 !important;
        }
    </style>
</head>
<body>
    {% if add_watermark %}
    <div class="watermark">{{ watermark_text }}</div>
    {% endif %}
    
    <main class="document">
        <!-- Header -->
        <header class="document-header">
            <div class="company-info">
                {% if company.logo %}
                <img src="{{ company.logo }}" alt="{{ company.name }}" class="logo-img" />
                {% endif %}
                <div class="brand">{{ company.name }}</div>
                <div class="tagline">{{ company.tagline }}</div>
            </div>
        </header>
        
        <!-- Reconciliation Header -->
        <div class="recon-header">
            <h1 class="recon-title">{% trans "Reconciliation Statement" %}</h1>
            <div class="recon-period">
                {{ from_date|date:"d.m.Y" }} — {{ to_date|date:"d.m.Y" }}
            </div>
        </div>
        
        <!-- Dealer Info -->
        <div class="dealer-info">
            <div class="dealer-name">{{ dealer }}</div>
        </div>
        
        <!-- Balance Summary -->
        <div class="balance-summary">
            <div class="balance-card">
                <div class="balance-label">{% trans "Opening Balance" %}</div>
                <div class="balance-value">{{ opening_balance_fmt }}</div>
            </div>
            
            <div class="balance-card">
                <div class="balance-label">{% trans "Orders" %}</div>
                <div class="balance-value text-warning">+{{ total_orders_fmt }}</div>
            </div>
            
            <div class="balance-card">
                <div class="balance-label">{% trans "Returns" %}</div>
                <div class="balance-value text-error">-{{ total_returns_fmt }}</div>
            </div>
            
            <div class="balance-card">
                <div class="balance-label">{% trans "Payments" %}</div>
                <div class="balance-value text-success">-{{ total_payments_fmt }}</div>
            </div>
            
            <div class="balance-card {% if summary.closing_balance > 0 %}positive{% else %}negative{% endif %}">
                <div class="balance-label">{% trans "Closing Balance" %}</div>
                <div class="balance-value">{{ closing_balance_fmt }}</div>
            </div>
        </div>
        
        {% if show_detailed %}
        <!-- Transactions Table -->
        <table>
            <thead>
                <tr>
                    <th>{% trans "Date" %}</th>
                    <th>{% trans "Description" %}</th>
                    <th class="text-right">{% trans "Debit" %}</th>
                    <th class="text-right">{% trans "Credit" %}</th>
                    <th class="text-right">{% trans "Balance" %}</th>
                </tr>
            </thead>
            <tbody>
                {% for trans in transactions %}
                <tr class="transaction-row type-{{ trans.type }}">
                    <td>{{ trans.date|date:"d.m.Y" }}</td>
                    <td><strong>{{ trans.description }}</strong></td>
                    <td class="text-right">{{ trans.debit }}</td>
                    <td class="text-right">{{ trans.credit }}</td>
                    <td class="text-right font-bold">{{ trans.balance_formatted }}</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
        {% endif %}
        
        <!-- Signatures -->
        <div class="signature-section">
            <div class="signature-box">
                <div class="signature-line">
                    {% trans "Company Representative" %}
                </div>
            </div>
            <div class="signature-box">
                <div class="signature-line">
                    {% trans "Dealer Representative" %}
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <footer class="document-footer">
            <div>
                <div class="footer-text">
                    {{ company.name }} | {{ company.phone }} | {{ company.email }}
                </div>
                <div class="footer-date" style="margin-top: 4px;">
                    {{ today|date:"d.m.Y" }}
                </div>
            </div>
        </footer>
    </main>
</body>
</html>
        '''
