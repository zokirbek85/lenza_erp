import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import http from '../app/http';
import toast from 'react-hot-toast';

interface InventoryAdjustment {
  id: number;
  product_sku: string;
  product_name: string;
  delta_ok: number;
  delta_defect: number;
  previous_ok: number;
  previous_defect: number;
  new_ok: number;
  new_defect: number;
  total_delta: number;
  date: string;
  created_by_name: string;
  comment: string;
  created_at: string;
}

interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: InventoryAdjustment[];
}

const InventoryAuditLogs = () => {
  const { t } = useTranslation();
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [total, setTotal] = useState(0);

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const response = await http.get<PaginatedResponse>('/inventory/adjustments/', {
        params: {
          page,
          page_size: pageSize,
        },
      });
      setAdjustments(response.data.results);
      setTotal(response.data.count);
    } catch (error) {
      console.error(error);
      toast.error('Audit loglarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdjustments();
  }, [page]);

  const totalPages = Math.ceil(total / pageSize);
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  return (
    <section className="h-full overflow-auto p-4 md:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          📋 Inventarizatsiya Tarixchasi
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Jismoniy inventarizatsiya natijasida yaratilgan tafovutlar
        </p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900 dark:border-slate-700 dark:border-t-white"></div>
        </div>
      ) : adjustments.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-slate-500 dark:text-slate-400">Hozircha audit yozuvlari yo'q</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
                    Mahsulot
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
                    OK Tafovut
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
                    Defect Tafovut
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
                    Eski → Yangi
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
                    Sana
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
                    Kim tomonidan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {adjustments.map((adj) => (
                  <tr
                    key={adj.id}
                    className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {adj.product_name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {adj.product_sku}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          adj.delta_ok > 0
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : adj.delta_ok < 0
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {adj.delta_ok >= 0 ? '+' : ''}
                        {adj.delta_ok}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          adj.delta_defect > 0
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : adj.delta_defect < 0
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {adj.delta_defect >= 0 ? '+' : ''}
                        {adj.delta_defect}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                        <p>
                          OK: {adj.previous_ok} → {adj.new_ok}
                        </p>
                        <p>
                          Defect: {adj.previous_defect} → {adj.new_defect}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-slate-700 dark:text-slate-300">
                      {new Date(adj.date).toLocaleDateString('uz-UZ')}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {adj.created_by_name}
                        </p>
                        {adj.comment && (
                          <p className="text-xs italic text-slate-500 dark:text-slate-400">
                            "{adj.comment}"
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Jami: {total} ta yozuv
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={!canGoPrev}
                className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300 disabled:opacity-40 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
              >
                {t('pagination.previous')}
              </button>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!canGoNext}
                className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300 disabled:opacity-40 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
              >
                {t('pagination.next')}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default InventoryAuditLogs;
