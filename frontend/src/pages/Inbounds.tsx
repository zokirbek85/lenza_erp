import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import {
  fetchInbounds,
  deleteInbound,
  confirmInbound,
  type Inbound,
} from '../api/inboundApi';
import { useAuthStore } from '../auth/useAuthStore';
import Modal from '../components/Modal';
import { formatDate } from '../utils/formatters';

const InboundsPage = () => {
  const navigate = useNavigate();
  const role = useAuthStore((state) => state.role);
  const [inbounds, setInbounds] = useState<Inbound[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<{ status?: string; brandId?: string }>({});
  const [confirmTarget, setConfirmTarget] = useState<Inbound | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Inbound | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canManage = role === 'admin' || role === 'warehouse';

  const loadInbounds = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page,
        page_size: pageSize,
      };

      if (filters.status) {
        params.status = filters.status;
      }
      if (filters.brandId) {
        params.brand = filters.brandId;
      }

      const result = await fetchInbounds(params);
      setInbounds(Array.isArray(result.items) ? result.items : []);
      setTotal(result.total);
    } catch (error) {
      console.error('Error loading inbounds:', error);
      toast.error('Failed to load inbounds');
      setInbounds([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  useEffect(() => {
    loadInbounds();
  }, [loadInbounds]);

  const handleConfirm = async () => {
    if (!confirmTarget) return;

    setConfirming(true);
    try {
      await confirmInbound(confirmTarget.id);
      toast.success('Inbound confirmed successfully');
      setConfirmTarget(null);
      loadInbounds();
    } catch (error: any) {
      console.error('Error confirming inbound:', error);
      toast.error(error?.response?.data?.detail || 'Failed to confirm inbound');
    } finally {
      setConfirming(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await deleteInbound(deleteTarget.id);
      toast.success('Inbound deleted successfully');
      setDeleteTarget(null);
      loadInbounds();
    } catch (error: any) {
      console.error('Error deleting inbound:', error);
      toast.error(error?.response?.data?.detail || 'Failed to delete inbound');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'confirmed') {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          Tasdiqlangan
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
        Qoralama
      </span>
    );
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Mahsulot kirimi
        </h1>
        {canManage && (
          <button
            onClick={() => navigate('/products/inbounds/create')}
            className="mt-4 sm:mt-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Yangi kirim
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-4">
        <select
          value={filters.status || ''}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="">Barcha holatlar</option>
          <option value="draft">Qoralama</option>
          <option value="confirmed">Tasdiqlangan</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Yetkazib beruvchi
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Sana
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Holat
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Mahsulotlar
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Jami miqdor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Amallar
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  Yuklanmoqda...
                </td>
              </tr>
            ) : inbounds.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  Kirimlar topilmadi
                </td>
              </tr>
            ) : (
              Array.isArray(inbounds) && inbounds.map((inbound) => (
                <tr key={inbound.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    #{inbound.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {inbound.brand_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatDate(inbound.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(inbound.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {inbound.total_items}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {inbound.total_quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => navigate(`/products/inbounds/${inbound.id}`)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                    >
                      Ko'rish
                    </button>
                    {canManage && inbound.status === 'draft' && (
                      <>
                        <button
                          onClick={() => navigate(`/products/inbounds/${inbound.id}/edit`)}
                          className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400"
                        >
                          Tahrirlash
                        </button>
                        <button
                          onClick={() => setConfirmTarget(inbound)}
                          className="text-green-600 hover:text-green-800 dark:text-green-400"
                        >
                          Tasdiqlash
                        </button>
                        <button
                          onClick={() => setDeleteTarget(inbound)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400"
                        >
                          O'chirish
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * pageSize >= total}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmTarget && (
        <Modal open={true} onClose={() => setConfirmTarget(null)} title="Tasdiqlash">
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Kirimni tasdiqlashni xohlaysizmi? Tasdiqlangandan keyin ombor qoldig'i yangilanadi va
              hujjatni o'zgartirish mumkin bo'lmaydi.
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Yetkazib beruvchi:</strong> {confirmTarget.brand_name}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Sana:</strong> {formatDate(confirmTarget.date)}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Mahsulotlar soni:</strong> {confirmTarget.total_items}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Jami miqdor:</strong> {confirmTarget.total_quantity}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmTarget(null)}
                disabled={confirming}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {confirming ? 'Tasdiqlanmoqda...' : 'Tasdiqlash'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <Modal open={true} onClose={() => setDeleteTarget(null)} title="O'chirish">
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Kirimni o'chirishni xohlaysizmi? Bu amalni bekor qilib bo'lmaydi.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'O\'chirilmoqda...' : 'O\'chirish'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default InboundsPage;
