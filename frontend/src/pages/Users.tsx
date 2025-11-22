import type { ChangeEvent, FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

import { useAuthStore } from '../auth/useAuthStore';
import http from '../app/http';
import Modal from '../components/Modal';
import PaginationControls from '../components/PaginationControls';
import { usePersistedPageSize } from '../hooks/usePageSize';
import { toArray } from '../utils/api';

interface UserRecord {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  role_display?: string;
  is_active: boolean;
}

const emptyForm = {
  username: '',
  first_name: '',
  last_name: '',
  email: '',
  role: 'sales',
  password: '',
};

const UsersPage = () => {
  const { t } = useTranslation();
  const { role } = useAuthStore();
  
  const ROLE_OPTIONS = [
    { label: t('users.roles.admin'), value: 'admin' },
    { label: t('users.roles.owner'), value: 'owner' },
    { label: t('users.roles.accountant'), value: 'accountant' },
    { label: t('users.roles.warehouse'), value: 'warehouse' },
    { label: t('users.roles.sales'), value: 'sales' },
  ];
  
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ role: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserRecord | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePersistedPageSize('users_page_size');
  const [total, setTotal] = useState(0);

  const canManage = useMemo(() => role === 'admin' || role === 'owner', [role]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await http.get('/users/', {
        params: {
          page,
          page_size: pageSize,
          ...(filters.role ? { role: filters.role } : {}),
        },
      });
      const data = response.data;
      let normalized: UserRecord[];
      if (data && typeof data === 'object' && Array.isArray(data.results)) {
        normalized = data.results as UserRecord[];
        setTotal(Number(data.count) || 0);
      } else {
        normalized = toArray<UserRecord>(data);
        setTotal(normalized.length);
      }
      setUsers(normalized);
    } catch (error) {
      console.error(error);
      toast.error(t('users.messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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

  const handleFilterChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setFilters({ role: event.target.value });
    setPage(1);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openModal = (user?: UserRecord) => {
    if (user) {
      setEditing(user);
      setForm({
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        password: '',
      });
    } else {
      setEditing(null);
      setForm(emptyForm);
    }
    setModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    const payload = {
      username: form.username,
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      role: form.role,
      ...(form.password ? { password: form.password } : {}),
    };
    try {
      if (editing) {
        await http.put(`/users/${editing.id}/`, payload);
        toast.success(t('users.messages.updated'));
      } else {
        await http.post('/users/', payload);
        toast.success(t('users.messages.created'));
      }
      setModalOpen(false);
      setForm(emptyForm);
      setEditing(null);
      loadUsers();
    } catch (error) {
      console.error(error);
      toast.error(t('users.messages.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (user: UserRecord) => {
    const path = user.is_active ? 'deactivate' : 'activate';
    try {
      await http.post(`/users/${user.id}/${path}/`);
      toast.success(user.is_active ? t('users.messages.deactivated') : t('users.messages.activated'));
      loadUsers();
    } catch (error) {
      console.error(error);
      toast.error(t('users.messages.statusError'));
    }
  };

  return (
    <section className="page-wrapper space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('users.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('users.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filters.role}
            onChange={handleFilterChange}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="">{t('users.filters.allRoles')}</option>
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {canManage && (
            <button
              onClick={() => openModal()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-emerald-500 dark:text-slate-900"
            >
              {t('users.new')}
            </button>
          )}
        </div>
      </header>

      <div className="table-wrapper overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">{t('users.table.username')}</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">{t('users.table.role')}</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">{t('users.table.email')}</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">{t('users.table.status')}</th>
              {canManage && <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">{t('table.actions')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {loading && (
              <tr>
                <td colSpan={canManage ? 5 : 4} className="px-4 py-6 text-center text-sm text-slate-500">
                  {t('users.messages.loading')}
                </td>
              </tr>
            )}
            {!loading &&
              users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{user.username}</td>
                  <td className="px-4 py-3 capitalize text-slate-600 dark:text-slate-200">{user.role_display ?? user.role}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-200">{user.email || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                        user.is_active
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200'
                      }`}
                    >
                      {user.is_active ? t('users.status.active') : t('users.status.inactive')}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="text-slate-600 hover:text-slate-900 dark:text-slate-300" onClick={() => openModal(user)}>
                          {t('actions.edit')}
                        </button>
                        <button
                          className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-300"
                          onClick={() => toggleActive(user)}
                        >
                          {user.is_active ? t('users.deactivate') : t('users.activate')}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={canManage ? 5 : 4} className="px-4 py-6 text-center text-sm text-slate-500">
                  {t('users.messages.noUsers')}
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
          if (!submitting) {
            setModalOpen(false);
            setForm(emptyForm);
            setEditing(null);
          }
        }}
        title={editing ? t('users.editTitle') : t('users.addTitle')}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                setForm(emptyForm);
                setEditing(null);
              }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              form="user-form"
              disabled={submitting}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60 dark:bg-emerald-500 dark:text-slate-900"
            >
              {submitting ? t('actions.saving') : t('actions.save')}
            </button>
          </>
        }
      >
        <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('users.form.username')}</label>
              <input
                required
                name="username"
                value={form.username}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('users.form.role')}</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('users.form.firstName')}</label>
              <input
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('users.form.lastName')}</label>
              <input
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('users.form.email')}</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {t('users.form.password')} {editing && <span className="text-xs text-slate-400">({t('users.form.passwordHint')})</span>}
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </form>
      </Modal>
    </section>
  );
};

export default UsersPage;

