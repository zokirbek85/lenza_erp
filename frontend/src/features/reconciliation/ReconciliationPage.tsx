import { PDFViewer, Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import http from '../../app/http';
import Modal from '../../components/Modal';
import { toArray } from '../../utils/api';
import { downloadFile } from '../../utils/download';
import { formatCurrency } from '../../utils/formatters';

interface DealerOption {
  id: number;
  name: string;
}

interface MovementEntry {
  date: string;
  label: string;
  amount_usd: number;
  direction: 'debit' | 'credit';
  type: 'order' | 'payment' | 'return';
}

interface ReconciliationResponse {
  dealer: string;
  dealer_code: string;
  period: string;
  opening_balance: number;
  closing_balance: number;
  orders: Array<{ date: string; order_no: string; amount_usd: number }>;
  payments: Array<{ date: string; method: string; amount_usd: number }>;
  returns: Array<{ date: string; order_no: string; amount_usd: number }>;
  movements: MovementEntry[];
  generated_at: string;
  from_date: string;
  to_date: string;
}

const pdfStyles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  logo: {
    fontSize: 20,
    fontWeight: 700,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    marginTop: 14,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    padding: 6,
  },
  tableHeader: {
    backgroundColor: '#f1f5f9',
    fontWeight: 600,
  },
});

const ReconciliationDocument = ({ report }: { report: ReconciliationResponse }) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <View style={pdfStyles.header}>
        <View>
          <Text style={pdfStyles.logo}>Lenza ERP</Text>
          <Text>Akt sverka (Reconciliation)</Text>
        </View>
        <View>
          <Text>Dealer: {report.dealer}</Text>
          <Text>Period: {report.period}</Text>
          <Text>Generated: {new Date(report.generated_at).toLocaleString()}</Text>
        </View>
      </View>

      <Text style={pdfStyles.sectionTitle}>Movements</Text>
      <View style={[pdfStyles.row]}>
        <Text style={[pdfStyles.cell, pdfStyles.tableHeader]}>Date</Text>
        <Text style={[pdfStyles.cell, pdfStyles.tableHeader]}>Label</Text>
        <Text style={[pdfStyles.cell, pdfStyles.tableHeader]}>Direction</Text>
        <Text style={[pdfStyles.cell, pdfStyles.tableHeader]}>Amount</Text>
      </View>
      {report.movements.map((entry, index) => (
        <View key={`${entry.label}-${index}`} style={pdfStyles.row}>
          <Text style={pdfStyles.cell}>{new Date(entry.date).toLocaleDateString()}</Text>
          <Text style={pdfStyles.cell}>{entry.label}</Text>
          <Text style={pdfStyles.cell}>{entry.direction === 'debit' ? 'Debit' : 'Credit'}</Text>
          <Text style={pdfStyles.cell}>{formatCurrency(entry.amount_usd)}</Text>
        </View>
      ))}
    </Page>
  </Document>
);

const defaultToDate = () => {
  const today = new Date();
  return today.toISOString().slice(0, 10);
};

const defaultFromDate = () => {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  return first.toISOString().slice(0, 10);
};

const ReconciliationPage = () => {
  const [dealers, setDealers] = useState<DealerOption[]>([]);
  const [selectedDealer, setSelectedDealer] = useState('');
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(defaultToDate);
  const [report, setReport] = useState<ReconciliationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const loadDealers = useCallback(async () => {
    try {
      const response = await http.get('/api/dealers/', { params: { page_size: 500 } });
      setDealers(toArray<DealerOption>(response.data));
    } catch (error) {
      console.error(error);
      toast.error("Dilerlarni yuklab bo'lmadi");
    }
  }, []);

  const fetchReport = useCallback(async () => {
    if (!selectedDealer) {
      toast.error('Avval diler tanlang');
      return;
    }
    setLoading(true);
    try {
      const response = await http.get<ReconciliationResponse>(`/api/dealers/${selectedDealer}/reconciliation/`, {
        params: { from_date: fromDate, to_date: toDate },
      });
      setReport(response.data);
    } catch (error) {
      console.error(error);
      toast.error('Akt sverka maʼlumotlarini olishda xatolik');
    } finally {
      setLoading(false);
    }
  }, [selectedDealer, fromDate, toDate]);

  const handlePdfDownload = async () => {
    if (!selectedDealer) {
      toast.error('Avval diler tanlang');
      return;
    }
    toast.loading('📄 Akt sverka PDF tayyorlanmoqda...', { id: 'reconciliation-pdf' });
    try {
      const filename = report ? `Akt_sverka_${report.dealer}.pdf` : 'Akt_sverka.pdf';
      await downloadFile(
        `/api/dealers/${selectedDealer}/reconciliation/pdf/?from_date=${fromDate}&to_date=${toDate}`,
        filename
      );
      toast.success('PDF yuklab olindi', { id: 'reconciliation-pdf' });
    } catch (error) {
      console.error(error);
      toast.error('PDF yaratishda xatolik yuz berdi', { id: 'reconciliation-pdf' });
    }
  };

  const movementRows = useMemo(() => report?.movements ?? [], [report]);

  useEffect(() => {
    loadDealers();
  }, [loadDealers]);

  const totalDebit = movementRows
    .filter((row) => row.direction === 'debit')
    .reduce((acc, row) => acc + (row.amount_usd ?? 0), 0);

  const totalCredit = movementRows
    .filter((row) => row.direction === 'credit')
    .reduce((acc, row) => acc + (row.amount_usd ?? 0), 0);

  const isEmptyState = report && movementRows.length === 0;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Lenza ERP</p>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Akt sverka</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Dilerlar bo&apos;yicha buyurtma va to&apos;lovlar muvofiqlashtirish hisobotlari.
          </p>
        </div>
        <div className="rounded-full border border-yellow-400 px-4 py-2 text-sm font-semibold text-yellow-600">
          Lenza ERP
        </div>
      </header>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          fetchReport();
        }}
        className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-4"
      >
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Diler</label>
          <select
            required
            value={selectedDealer}
            onChange={(event) => setSelectedDealer(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">Tanlang</option>
            {dealers.map((dealer) => (
              <option key={dealer.id} value={dealer.id}>
                {dealer.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Boshlanish sanasi</label>
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Tugash sanasi</label>
          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div className="flex items-end gap-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white transition hover:bg-slate-700 disabled:opacity-50 dark:bg-emerald-500 dark:text-slate-900"
          >
            {loading ? 'Yuklanmoqda...' : "Ko'rsatish"}
          </button>
        </div>
      </form>

      {report ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400">Davr</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">{report.period}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400">Boshlang&apos;ich balans</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                {formatCurrency(report.opening_balance)}
              </p>
            </div>
            <div className="rounded-2xl border border-yellow-200 bg-gradient-to-br from-yellow-50 to-white p-4 shadow-md dark:border-yellow-500/40 dark:from-slate-900 dark:to-slate-900">
              <p className="text-sm uppercase tracking-wide text-yellow-600">Yakuniy balans</p>
              <p className="text-2xl font-semibold text-yellow-600">{formatCurrency(report.closing_balance)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handlePdfDownload}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800"
            >
              📄 PDF
            </button>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="rounded-lg border border-yellow-400 px-4 py-2 text-sm font-semibold text-yellow-600 transition hover:bg-yellow-50 dark:border-yellow-500 dark:text-yellow-400 dark:hover:bg-slate-800"
            >
              Print preview
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Harakatlar</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Buyurtmalar, to&apos;lovlar va qaytarishlar.</p>
              </div>
              <div className="text-right text-sm">
                <p className="text-slate-500 dark:text-slate-400">Debit: {formatCurrency(totalDebit)}</p>
                <p className="text-slate-500 dark:text-slate-400">Kredit: {formatCurrency(totalCredit)}</p>
              </div>
            </div>

            {isEmptyState ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Tanlangan davr uchun ma&apos;lumot topilmadi.
              </div>
            ) : (
              <>
                <div className="hidden md:block">
                  <table className="w-full border border-gray-300 bg-white text-sm shadow-sm transition-all dark:border-slate-700 dark:bg-slate-900">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                      <tr>
                        <th className="px-4 py-3">Sana</th>
                        <th className="px-4 py-3">Nomi</th>
                        <th className="px-4 py-3">Yo&apos;nalish</th>
                        <th className="px-4 py-3 text-right">Miqdor (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movementRows.map((row, index) => (
                        <tr key={`${row.label}-${index}`} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                            {new Date(row.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-slate-900 dark:text-white">{row.label}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                row.direction === 'debit'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200'
                              }`}
                            >
                              {row.direction === 'debit' ? 'Debet' : 'Kredit'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                            {formatCurrency(row.amount_usd)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 md:hidden">
                  {movementRows.map((row, index) => (
                    <div
                      key={`${row.label}-${index}`}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                    >
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {new Date(row.date).toLocaleDateString()}
                      </p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">{row.label}</p>
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            row.direction === 'debit'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200'
                          }`}
                        >
                          {row.direction === 'debit' ? 'Debet' : 'Kredit'}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(row.amount_usd)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="mt-6 flex flex-col gap-3 text-sm text-slate-500 dark:text-slate-400 md:flex-row md:items-center md:justify-between">
              <p>Imzo: _____________________________</p>
              <p>Sana: ___ / ___ / ____</p>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          Avval filtrlarni tanlab, hisobotni ko&apos;rsating.
        </div>
      )}

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Print preview"
        widthClass="max-w-5xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-amber-500 dark:text-slate-900"
            >
              Chop etish
            </button>
          </>
        }
      >
        {report ? (
          <PDFViewer style={{ width: '100%', height: '70vh' }}>
            <ReconciliationDocument report={report} />
          </PDFViewer>
        ) : (
          <p className="text-sm text-slate-500">Preview mavjud emas</p>
        )}
      </Modal>
    </section>
  );
};

export default ReconciliationPage;
