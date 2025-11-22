import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  detailed?: boolean;
  orders_detailed?: Array<{
    id: number;
    order_number: string;
    date: string;
    total_amount: number;
    items: Array<{
      id: number;
      product_name: string;
      quantity: number;
      price: number;
      total: number;
    }>;
  }>;
}

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
  const { t } = useTranslation();
  const [dealers, setDealers] = useState<DealerOption[]>([]);
  const [selectedDealer, setSelectedDealer] = useState('');
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(defaultToDate);
  const [report, setReport] = useState<ReconciliationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [detailed, setDetailed] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  const loadDealers = useCallback(async () => {
    try {
      const response = await http.get('/dealers/', { params: { page_size: 500 } });
      setDealers(toArray<DealerOption>(response.data));
    } catch (error) {
      console.error(error);
      toast.error(t('reconciliation.toast.dealersError'));
    }
  }, []);

  const fetchReport = useCallback(async () => {
    if (!selectedDealer) {
      toast.error('Avval diler tanlang');
      return;
    }
    setLoading(true);
    try {
      const response = await http.get<ReconciliationResponse>(`/dealers/${selectedDealer}/reconciliation/`, {
        params: { from_date: fromDate, to_date: toDate, detailed },
      });
      setReport(response.data);
    } catch (error) {
      console.error(error);
      toast.error(t('reconciliation.toast.loadError'));
    } finally {
      setLoading(false);
    }
  }, [selectedDealer, fromDate, toDate]);

  const loadPdfPreview = useCallback(async () => {
    if (!selectedDealer) {
      toast.error('Avval diler tanlang');
      return;
    }

    try {
      // Revoke previous blob URL if exists
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }

      const response = await http.get(
        `/dealers/${selectedDealer}/reconciliation/pdf/?from_date=${fromDate}&to_date=${toDate}&detailed=${detailed}`,
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
      setPreviewOpen(true);
    } catch (error) {
      console.error(error);
      toast.error(t('reconciliation.toast.previewError'));
    }
  }, [selectedDealer, fromDate, toDate, detailed, pdfBlobUrl]);

  const handlePdfDownload = async () => {
    if (!selectedDealer) {
      toast.error('Avval diler tanlang');
      return;
    }
    toast.loading(t('reconciliation.toast.pdfLoading'), { id: 'reconciliation-pdf' });
    try {
      const filename = report ? `Akt_sverka_${report.dealer}.pdf` : 'Akt_sverka.pdf';
      await downloadFile(
        `/dealers/${selectedDealer}/reconciliation/pdf/?from_date=${fromDate}&to_date=${toDate}&detailed=${detailed}`,
        filename
      );
      toast.success(t('reconciliation.toast.pdfSuccess'), { id: 'reconciliation-pdf' });
    } catch (error) {
      console.error(error);
      toast.error(t('reconciliation.toast.pdfError'), { id: 'reconciliation-pdf' });
    }
  };

  const movementRows = useMemo(() => report?.movements ?? [], [report]);

  useEffect(() => {
    loadDealers();
  }, [loadDealers]);

  // Auto refresh when toggling detailed option, if a dealer is selected
  useEffect(() => {
    if (selectedDealer) {
      fetchReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailed]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

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
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={detailed}
                onChange={(e) => setDetailed(e.target.checked)}
              />
              Batafsil hisobot
            </label>
            <button
              type="button"
              onClick={loadPdfPreview}
              className="rounded-lg border border-emerald-500 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
            >
              👁️ Ko&apos;rish
            </button>
            <button
              type="button"
              onClick={handlePdfDownload}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800"
            >
              📄 PDF eksport
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!selectedDealer) {
                  toast.error('Avval diler tanlang');
                  return;
                }
                try {
                  await downloadFile(
                    `/dealers/${selectedDealer}/reconciliation/excel/?from_date=${fromDate}&to_date=${toDate}&detailed=${detailed}`,
                    'reconciliation.xlsx'
                  );
                  toast.success('Excel yuklab olindi');
                } catch (error) {
                  console.error(error);
                  toast.error('Excel eksportda xatolik');
                }
              }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800"
            >
              📊 Excel eksport
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

          {report?.detailed && (report.orders_detailed?.length ?? 0) > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Buyurtmalar (batafsil)</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Har bir buyurtma uchun itemlar ro'yxati.</p>
              </div>
              <div className="space-y-4">
                {report.orders_detailed!.map((o) => (
                  <div key={o.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{o.order_number}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {new Date(o.date).toLocaleDateString()} вЂў Jami: {formatCurrency(o.total_amount)}
                      </div>
                    </div>
                    <div className="table-wrapper overflow-x-auto">
                      <table className="w-full border border-gray-300 bg-white text-sm shadow-sm transition-all dark:border-slate-700 dark:bg-slate-900">
                        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                          <tr>
                            <th className="px-4 py-3">Mahsulot</th>
                            <th className="px-4 py-3 text-right">Miqdor</th>
                            <th className="px-4 py-3 text-right">Narx</th>
                            <th className="px-4 py-3 text-right">Jami</th>
                          </tr>
                        </thead>
                        <tbody>
                          {o.items.map((it) => (
                            <tr key={it.id} className="border-t border-slate-100 dark:border-slate-800">
                              <td className="px-4 py-3 text-slate-900 dark:text-white">{it.product_name}</td>
                              <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-200">{Number(it.quantity ?? 0).toFixed(2)}</td>
                              <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-200">{formatCurrency(it.price)}</td>
                              <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">{formatCurrency(it.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          Avval filtrlarni tanlab, hisobotni ko&apos;rsating.
        </div>
      )}

      <Modal
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          // Clean up blob URL when modal closes
          if (pdfBlobUrl) {
            URL.revokeObjectURL(pdfBlobUrl);
            setPdfBlobUrl(null);
          }
        }}
        title="PDF ko'rish"
        widthClass="max-w-7xl"
      >
        {pdfBlobUrl ? (
          <iframe
            src={pdfBlobUrl}
            style={{
              width: '100%',
              height: '80vh',
              border: 'none',
              borderRadius: '0.5rem',
            }}
            title="PDF Preview"
          />
        ) : (
          <p className="text-sm text-slate-500">Preview mavjud emas</p>
        )}
      </Modal>
    </section>
  );
};

export default ReconciliationPage;

