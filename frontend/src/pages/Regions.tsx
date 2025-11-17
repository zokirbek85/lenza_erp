import type { ChangeEvent, FormEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

import http from '../app/http';
import Modal from '../components/Modal';
import PaginationControls from '../components/PaginationControls';
import { usePersistedPageSize } from '../hooks/usePageSize';
import { toArray } from '../utils/api';
import { useFetch } from '../hooks/useFetch';

interface RegionRecord {
  id: number;
  name: string;
  manager_user?: string | null;
  manager_user_id?: number | null;
}

interface ManagerRecord {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
}

const emptyRegion = {
  name: '',
  manager_user_id: '' as number | '',
};

const RegionsPage = () => {
  const { t } = useTranslation();
  const [regions, setRegions] = useState<RegionRecord[]>([]);
  const [managers, setManagers] = useState<ManagerRecord[]>([]);
  const [form, setForm] = useState(emptyRegion);
  const [editing, setEditing] = useState<RegionRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePersistedPageSize('regions_page_size');
  const [total, setTotal] = useState(0);

  const loadRegions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await http.get('/api/regions/', { params: { page, page_size: pageSize } });
      const data = response.data;
      let normalized: RegionRecord[];
      if (data && typeof data === 'object' && Array.isArray(data.results)) {
        normalized = data.results as RegionRecord[];
        setTotal(Number(data.count) || 0);
      } else {
        normalized = toArray<RegionRecord>(data);
        setTotal(normalized.length);
      }
      setRegions(normalized);
    } catch (error) {
      console.error(error);
      toast.error(t('regions.messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  const { data: managerResponse } = useFetch<ManagerRecord[]>('/api/users/', { params: { role: 'sales' } });

  useEffect(() => {
    loadRegions();
  }, [loadRegions]);

  useEffect(() => {
    if (total === 0) {
      if (page !== 1) setPage(1);
      return;
    }
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [total, pageSize, page]);

  useEffect(() => {
    if (managerResponse) {
      setManagers(Array.isArray(managerResponse) ? managerResponse : toArray<ManagerRecord>(managerResponse));
    }
  }, [managerResponse]);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openModal = (region?: RegionRecord) => {
    if (region) {
      setEditing(region);
      setForm({
        name: region.name,
        manager_user_id: region.manager_user_id ?? '',
      });
    } else {
      setEditing(null);
      setForm(emptyRegion);
    }
    setModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      manager_user_id: form.manager_user_id || null,
    };
    try {
      if (editing) {
        await http.put(`/api/regions/${editing.id}/`, payload);
        toast.success(t('regions.messages.updated'));
      } else {
        await http.post('/api/regions/', payload);
        toast.success(t('regions.messages.created'));
      }
      setModalOpen(false);
      setForm(emptyRegion);
      setEditing(null);
      loadRegions();
    } catch (error: unknown) {
      console.error(error);
      if (typeof error === 'object' && error && 'response' in error) {
        const detail = (error as { response?: { data?: Record<string, string[]> } }).response?.data;
        const message = detail?.name?.[0] || t('regions.messages.saveError');
        toast.error(message);
      } else {
        toast.error(t('regions.messages.saveError'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (region: RegionRecord) => {
    if (!window.confirm(t('regions.confirmDelete', { name: region.name }))) return;
    try {
      await http.delete(`/api/regions/${region.id}/`);
      toast.success(t('regions.messages.deleted'));
      loadRegions();
    } catch (error) {
      console.error(error);
      toast.error(t('regions.messages.deleteError'));
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('regions.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('regions.subtitle')}</p>
        </div>
        <button
          onClick={() => openModal()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-emerald-500 dark:text-slate-900"
        >
          {t('regions.new')}
        </button>
      </header>

      <div className="table-wrapper overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/40">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">{t('regions.table.name')}</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">{t('regions.table.manager')}</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {loading && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-500">
                  {t('regions.messages.loading')}
                </td>
              </tr>
            )}
            {!loading &&
              regions.map((region) => (
                <tr key={region.id}>
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{region.name}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-200">{region.manager_user || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button className="text-slate-600 hover:text-slate-900 dark:text-slate-300" onClick={() => openModal(region)}>
                        {t('actions.edit')}
                      </button>
                      <button className="text-rose-600 hover:text-rose-800 dark:text-rose-300" onClick={() => handleDelete(region)}>
                        {t('actions.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            {!loading && regions.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-500">
                  {t('regions.messages.noRegions')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-0 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
        <PaginationControls
          page={page}
          pageSize={pageSize}
          total={total}
          setPage={setPage}
          setPageSize={setPageSize}
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          if (!saving) {
            setModalOpen(false);
            setForm(emptyRegion);
            setEditing(null);
          }
        }}
        title={editing ? t('regions.editTitle') : t('regions.addTitle')}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                setForm(emptyRegion);
                setEditing(null);
              }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              form="region-form"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60 dark:bg-emerald-500 dark:text-slate-900"
            >
              {saving ? t('actions.saving') : t('actions.save')}
            </button>
          </>
        }
      >
        <form id="region-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('regions.form.name')}</label>
            <input
              required
              name="name"
              value={form.name}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('regions.form.manager')}</label>
            <select
              name="manager_user_id"
              value={form.manager_user_id}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">{t('regions.form.unassigned')}</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.first_name || manager.last_name ? `${manager.first_name} ${manager.last_name}`.trim() : manager.username}
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>
    </section>
  );
};

export default RegionsPage;
