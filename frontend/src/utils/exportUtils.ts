import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CashSummary, FinanceTransaction } from '../types/finance';


/**
 * Format currency with proper symbol and thousands separator
 */
export const formatCurrency = (amount: number | undefined | null, currency: 'USD' | 'UZS'): string => {
  const symbol = currency === 'USD' ? '$' : 'UZS';
  const safeAmount = amount || 0;
  const formatted = safeAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${symbol}`;
};

/**
 * Format date to readable string
 */
export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Initialize PDF with proper encoding support
 * Uses standard fonts with Unicode support through jsPDF's built-in text encoding
 */
const initPDFWithUTF8 = (orientation: 'portrait' | 'landscape' = 'portrait'): jsPDF => {
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
    floatPrecision: 16, // or "smart", default is 16
  });

  // Use helvetica which has good Unicode support in jsPDF
  doc.setFont('helvetica');

  return doc;
};

/**
 * Export Finance Dashboard to PDF
 * 🔧 UTF-8 encoding fix: Roboto font ishlatiladi
 */
export const exportFinanceDashboardToPDF = (data: CashSummary) => {
  // 🔧 UTF-8 font bilan ishga tushiramiz
  const doc = initPDFWithUTF8();

  // Add title
  doc.setFontSize(18);
  doc.text('Finance Dashboard Report', 14, 20);

  // Add date
  doc.setFontSize(10);
  doc.text(`Generated on: ${formatDate(new Date())}`, 14, 28);

  // Summary Section
  doc.setFontSize(14);
  doc.text('Cash Summary', 14, 40);

  // Balance Summary Table
  const balanceData = [
    ['Currency', 'Total Balance', 'Total Income', 'Total Expense'],
    ['USD', formatCurrency(data.total_balance_usd, 'USD'), formatCurrency(data.total_income_usd, 'USD'), formatCurrency(data.total_expense_usd, 'USD')],
    ['UZS', formatCurrency(data.total_balance_uzs, 'UZS'), formatCurrency(data.total_income_uzs, 'UZS'), formatCurrency(data.total_expense_uzs, 'UZS')],
  ];

  autoTable(doc, {
    startY: 45,
    head: [balanceData[0]],
    body: balanceData.slice(1),
    theme: 'grid',
    headStyles: {
      fillColor: [22, 119, 255],
    },
  });

  // Accounts Section
  const finalY = (doc as any).lastAutoTable.finalY || 80;
  doc.setFontSize(14);
  doc.text('Finance Accounts', 14, finalY + 10);

  const accountsData = [
    ['Account Name', 'Type', 'Currency', 'Opening Balance', 'Income', 'Expense', 'Balance', 'Status'],
    ...data.accounts.map(account => [
      account.account_name,
      account.account_type.toUpperCase(),
      account.currency,
      formatCurrency(account.opening_balance_amount, account.currency),
      formatCurrency(account.income_total, account.currency),
      formatCurrency(account.expense_total, account.currency),
      formatCurrency(account.balance, account.currency),
      account.is_active ? 'Active' : 'Inactive',
    ]),
  ];

  autoTable(doc, {
    startY: finalY + 15,
    head: [accountsData[0]],
    body: accountsData.slice(1),
    theme: 'grid',
    headStyles: {
      fillColor: [22, 119, 255],
    },
    styles: { fontSize: 8 },
  });

  // Save PDF
  doc.save(`finance-dashboard-${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Export Finance Dashboard to XLSX
 * XLSX da encoding muammosi yo'q, shuning uchun o'zgartirilmagan
 */
export const exportFinanceDashboardToXLSX = (data: CashSummary) => {
  // Create workbook
  const wb = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = [
    ['Finance Dashboard Report'],
    [`Generated on: ${formatDate(new Date())}`],
    [],
    ['Cash Summary'],
    ['Currency', 'Total Balance', 'Total Income', 'Total Expense'],
    ['USD', data.total_balance_usd, data.total_income_usd, data.total_expense_usd],
    ['UZS', data.total_balance_uzs, data.total_income_uzs, data.total_expense_uzs],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

  // Set column widths
  summarySheet['!cols'] = [
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // Accounts Sheet
  const accountsData = [
    ['Account Name', 'Type', 'Currency', 'Opening Balance', 'Income', 'Expense', 'Balance', 'Status'],
    ...data.accounts.map(account => [
      account.account_name,
      account.account_type.toUpperCase(),
      account.currency,
      account.opening_balance_amount,
      account.income_total,
      account.expense_total,
      account.balance,
      account.is_active ? 'Active' : 'Inactive',
    ]),
  ];

  const accountsSheet = XLSX.utils.aoa_to_sheet(accountsData);

  // Set column widths
  accountsSheet['!cols'] = [
    { wch: 20 },
    { wch: 10 },
    { wch: 10 },
    { wch: 18 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 10 },
  ];

  XLSX.utils.book_append_sheet(wb, accountsSheet, 'Accounts');

  // Save file
  XLSX.writeFile(wb, `finance-dashboard-${new Date().toISOString().split('T')[0]}.xlsx`);
};

/**
 * Export Finance Transactions to PDF
 * 🔧 UTF-8 encoding fix: Roboto font ishlatiladi
 */
export const exportTransactionsToPDF = (
  transactions: FinanceTransaction[],
  filters?: {
    type?: string;
    status?: string;
    currency?: string;
    startDate?: string;
    endDate?: string;
  }
) => {
  // 🔧 UTF-8 font bilan ishga tushiramiz
  const doc = initPDFWithUTF8('landscape');

  // Add title
  doc.setFontSize(18);
  doc.text('Finance Transactions Report', 14, 20);

  // Add date
  doc.setFontSize(10);
  doc.text(`Generated on: ${formatDate(new Date())}`, 14, 28);

  // Add filters if present
  let yPos = 35;
  if (filters) {
    doc.setFontSize(10);
    doc.text('Filters Applied:', 14, yPos);
    yPos += 5;

    if (filters.type) {
      doc.text(`Type: ${filters.type}`, 20, yPos);
      yPos += 5;
    }
    if (filters.status) {
      doc.text(`Status: ${filters.status}`, 20, yPos);
      yPos += 5;
    }
    if (filters.currency) {
      doc.text(`Currency: ${filters.currency}`, 20, yPos);
      yPos += 5;
    }
    if (filters.startDate) {
      doc.text(`From: ${formatDate(filters.startDate)}`, 20, yPos);
      yPos += 5;
    }
    if (filters.endDate) {
      doc.text(`To: ${formatDate(filters.endDate)}`, 20, yPos);
      yPos += 5;
    }
    yPos += 5;
  }

  // Transactions Table
  const transactionsData = [
    ['Date', 'Type', 'Account', 'Category/Dealer', 'Amount', 'Currency', 'Status', 'Comment'],
    ...transactions.map(transaction => [
      formatDate(transaction.date),
      transaction.type.replace('_', ' ').toUpperCase(),
      transaction.account_name || '',
      transaction.type === 'income'
        ? transaction.dealer_name || ''
        : transaction.category || '',
      (Number(transaction.amount) || 0).toFixed(2),
      transaction.currency || '',
      transaction.status.toUpperCase(),
      transaction.comment || '',
    ]),
  ];

  autoTable(doc, {
    startY: yPos,
    head: [transactionsData[0]],
    body: transactionsData.slice(1),
    theme: 'grid',
    headStyles: {
      fillColor: [22, 119, 255],
    },
    styles: { fontSize: 8 },
  });

  // Add totals
  const finalY = (doc as any).lastAutoTable.finalY || yPos + 20;
  doc.setFontSize(12);

  const totals = transactions.reduce(
    (acc, t) => {
      if (t.status === 'approved') {
        const amount = Number(t.amount) || 0;
        if (t.type === 'income') {
          if (t.currency === 'USD') acc.incomeUSD += amount;
          else acc.incomeUZS += amount;
        } else if (t.type === 'expense') {
          if (t.currency === 'USD') acc.expenseUSD += amount;
          else acc.expenseUZS += amount;
        }
      }
      return acc;
    },
    { incomeUSD: 0, incomeUZS: 0, expenseUSD: 0, expenseUZS: 0 }
  );

  doc.text('Summary (Approved Transactions Only):', 14, finalY + 10);
  doc.setFontSize(10);
  doc.text(`Total Income (USD): ${formatCurrency(totals.incomeUSD, 'USD')}`, 14, finalY + 17);
  doc.text(`Total Income (UZS): ${formatCurrency(totals.incomeUZS, 'UZS')}`, 14, finalY + 24);
  doc.text(`Total Expense (USD): ${formatCurrency(totals.expenseUSD, 'USD')}`, 14, finalY + 31);
  doc.text(`Total Expense (UZS): ${formatCurrency(totals.expenseUZS, 'UZS')}`, 14, finalY + 38);

  // Save PDF
  doc.save(`finance-transactions-${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Export Finance Transactions to XLSX
 * XLSX da encoding muammosi yo'q, shuning uchun o'zgartirilmagan
 */
export const exportTransactionsToXLSX = (
  transactions: FinanceTransaction[],
  filters?: {
    type?: string;
    status?: string;
    currency?: string;
    startDate?: string;
    endDate?: string;
  }
) => {
  // Create workbook
  const wb = XLSX.utils.book_new();

  // Info Sheet
  const infoData: any[][] = [
    ['Finance Transactions Report'],
    [`Generated on: ${formatDate(new Date())}`],
    [],
  ];

  if (filters) {
    infoData.push(['Filters Applied:']);
    if (filters.type) infoData.push(['Type', filters.type]);
    if (filters.status) infoData.push(['Status', filters.status]);
    if (filters.currency) infoData.push(['Currency', filters.currency]);
    if (filters.startDate) infoData.push(['From', formatDate(filters.startDate)]);
    if (filters.endDate) infoData.push(['To', formatDate(filters.endDate)]);
    infoData.push([]);
  }

  // Calculate totals
  const totals = transactions.reduce(
    (acc, t) => {
      if (t.status === 'approved') {
        const amount = Number(t.amount) || 0;
        if (t.type === 'income') {
          if (t.currency === 'USD') acc.incomeUSD += amount;
          else acc.incomeUZS += amount;
        } else if (t.type === 'expense') {
          if (t.currency === 'USD') acc.expenseUSD += amount;
          else acc.expenseUZS += amount;
        }
      }
      return acc;
    },
    { incomeUSD: 0, incomeUZS: 0, expenseUSD: 0, expenseUZS: 0 }
  );

  infoData.push(['Summary (Approved Transactions Only)']);
  infoData.push(['Total Income (USD)', totals.incomeUSD]);
  infoData.push(['Total Income (UZS)', totals.incomeUZS]);
  infoData.push(['Total Expense (USD)', totals.expenseUSD]);
  infoData.push(['Total Expense (UZS)', totals.expenseUZS]);

  const infoSheet = XLSX.utils.aoa_to_sheet(infoData);
  infoSheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, infoSheet, 'Info');

  // Transactions Sheet
  const transactionsData = [
    ['Date', 'Type', 'Account', 'Category/Dealer', 'Manager', 'Amount USD', 'Amount UZS', 'Exchange Rate', 'Status', 'Comment', 'Created By', 'Approved By'],
    ...transactions.map(transaction => {
      const amountUSD = transaction.currency === 'USD' 
        ? Number(transaction.amount) || 0
        : Number(transaction.amount_usd) || 0;
      const amountUZS = transaction.currency === 'UZS'
        ? Number(transaction.amount) || 0
        : Number(transaction.amount_uzs) || 0;
      const exchangeRate = transaction.exchange_rate || '';
      
      return [
        formatDate(transaction.date),
        transaction.type.replace('_', ' ').toUpperCase(),
        transaction.account_name || '',
        transaction.type === 'income'
          ? transaction.dealer_name || ''
          : transaction.category || '',
        transaction.manager_name || '',
        amountUSD,
        amountUZS,
        exchangeRate,
        transaction.status.toUpperCase(),
        transaction.comment || '',
        transaction.created_by_name || '',
        transaction.approved_by_name || '',
      ];
    }),
  ];

  const transactionsSheet = XLSX.utils.aoa_to_sheet(transactionsData);

  // Set column widths
  transactionsSheet['!cols'] = [
    { wch: 12 },  // Date
    { wch: 20 },  // Type
    { wch: 15 },  // Account
    { wch: 20 },  // Category/Dealer
    { wch: 15 },  // Manager
    { wch: 15 },  // Amount USD
    { wch: 15 },  // Amount UZS
    { wch: 12 },  // Exchange Rate
    { wch: 10 },  // Status
    { wch: 30 },  // Comment
    { wch: 15 },  // Created By
    { wch: 15 },  // Approved By
  ];

  XLSX.utils.book_append_sheet(wb, transactionsSheet, 'Transactions');

  // Save file
  XLSX.writeFile(wb, `finance-transactions-${new Date().toISOString().split('T')[0]}.xlsx`);
};

/**
 * Export Manager KPI Details to PDF
 * Shows dealer-level breakdown with sales, payments by type, and KPI calculation
 */
export const exportManagerKPIToPDF = (data: {
  manager_name: string;
  regions: string;
  from_date: string;
  to_date: string;
  dealers: Array<{
    dealer_name: string;
    sales_usd: number;
    payment_cash_usd: number;
    payment_card_usd: number;
    payment_bank_usd: number;
    total_payment_usd: number;
    kpi_usd: number;
  }>;
  totals: {
    sales_usd: number;
    payment_cash_usd: number;
    payment_card_usd: number;
    payment_bank_usd: number;
    total_payment_usd: number;
    kpi_usd: number;
  };
}) => {
  const doc = initPDFWithUTF8('landscape');
  
  // Format date range for title
  const formatDateRange = (from: string, to: string) => {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const monthNames = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 
                        'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
    
    if (fromDate.getMonth() === toDate.getMonth() && fromDate.getFullYear() === toDate.getFullYear()) {
      return `${monthNames[fromDate.getMonth()]}(${String(fromDate.getDate()).padStart(2, '0')}.${String(fromDate.getMonth() + 1).padStart(2, '0')}.${fromDate.getFullYear()}-${String(toDate.getDate()).padStart(2, '0')}.${String(toDate.getMonth() + 1).padStart(2, '0')}.${toDate.getFullYear()})`;
    }
    return `${String(fromDate.getDate()).padStart(2, '0')}.${String(fromDate.getMonth() + 1).padStart(2, '0')}.${fromDate.getFullYear()}-${String(toDate.getDate()).padStart(2, '0')}.${String(toDate.getMonth() + 1).padStart(2, '0')}.${toDate.getFullYear()}`;
  };
  
  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const title = `${data.regions} (${data.manager_name})`;
  doc.text(title, 148, 15, { align: 'center' });
  
  // Date range
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const dateRange = formatDateRange(data.from_date, data.to_date);
  doc.text(dateRange, 148, 22, { align: 'center' });
  
  // Prepare table data
  const tableData = data.dealers.map((dealer, index) => [
    (index + 1).toString(),
    dealer.dealer_name,
    dealer.sales_usd.toFixed(2),
    dealer.payment_cash_usd.toFixed(2),
    dealer.payment_card_usd.toFixed(2),
    dealer.payment_bank_usd.toFixed(2),
    dealer.total_payment_usd.toFixed(2),
    dealer.kpi_usd.toFixed(2),
  ]);
  
  // Add totals row
  tableData.push([
    '',
    'Umumiy',
    data.totals.sales_usd.toFixed(2),
    data.totals.payment_cash_usd.toFixed(2),
    data.totals.payment_card_usd.toFixed(2),
    data.totals.payment_bank_usd.toFixed(2),
    data.totals.total_payment_usd.toFixed(2),
    data.totals.kpi_usd.toFixed(2),
  ]);
  
  // Create table
  autoTable(doc, {
    startY: 28,
    head: [[
      'No',
      'Klient',
      'Tovar sum $',
      'Naqd $',
      'Plastik $',
      'Per/ya $',
      'Umumiy $',
      'KPI (1%) $'
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [255, 200, 100],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },  // No
      1: { halign: 'left', cellWidth: 60 },    // Klient
      2: { halign: 'right', cellWidth: 25 },   // Tovar sum
      3: { halign: 'right', cellWidth: 25 },   // Naqd
      4: { halign: 'right', cellWidth: 25 },   // Plastik
      5: { halign: 'right', cellWidth: 25 },   // Per/ya
      6: { halign: 'right', cellWidth: 25 },   // Umumiy
      7: { halign: 'right', cellWidth: 25 },   // KPI
    },
    didParseCell: (data) => {
      // Highlight totals row
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fillColor = [255, 200, 100];
        data.cell.styles.fontStyle = 'bold';
      }
      // Highlight green rows (like in the image)
      if (data.row.index < tableData.length - 1 && data.row.index % 2 === 0) {
        data.cell.styles.fillColor = [200, 255, 200];
      }
    },
  });
  
  // Save PDF
  const fileName = `manager-kpi-${data.manager_name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};