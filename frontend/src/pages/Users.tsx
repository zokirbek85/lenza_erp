import type { ChangeEvent, FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Select } from 'antd';
import toast from 'react-hot-toast';

import { useAuthStore } from '../auth/useAuthStore';
import http from '../app/http';
import Modal from '../components/Modal';
import PaginationControls from '../components/PaginationControls';
import { usePersistedPageSize } from '../hooks/usePageSize';
import { useIsMobile } from '../hooks/useIsMobile';
import { toArray } from '../utils/api';
import FilterDrawer from '../components/responsive/filters/FilterDrawer';
import FilterTrigger from '../components/responsive/filters/FilterTrigger';
import UsersMobileCards from './_mobile/UsersMobileCards';
import type { UsersMobileHandlers } from './_mobile/UsersMobileCards';

interface UserRecord {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  role_display?: string;
  is_active: boolean;
  last_seen?: string;
  is_online?: boolean;
  archived_at?: string;
  archived_reason?: string;
  archived_reason_display?: string;
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
  const { isMobile } = useIsMobile();
  
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
  const [filtersOpen, setFiltersOpen] = useState(false);
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

  const handleFilterChange = (value: string) => {
    setFilters({ role: value });
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

  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [userToReplace, setUserToReplace] = useState<UserRecord | null>(null);
  const [replaceForm, setReplaceForm] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    archive_reason: 'replaced',
    comment: '',
  });

  const openReplaceModal = (user: UserRecord) => {
    setUserToReplace(user);
    setReplaceForm({
      username: '',
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      archive_reason: 'replaced',
      comment: '',
    });
    setReplaceModalOpen(true);
  };

  const handleReplaceSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!userToReplace) return;
    
    setSubmitting(true);
    try {
      await http.post(`/users/${userToReplace.id}/replace/`, {
        new_user: {
          username: replaceForm.username,
          first_name: replaceForm.first_name,
          last_name: replaceForm.last_name,
          email: replaceForm.email,
          password: replaceForm.password,
        },
        archive_reason: replaceForm.archive_reason,
        comment: replaceForm.comment,
      });
      toast.success(t('users.messages.replaced'));
      setReplaceModalOpen(false);
      setUserToReplace(null);
      loadUsers();
    } catch (error: any) {
      console.error(error);
      const errorMsg = error?.response?.data?.detail || t('users.messages.replaceError');
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const mobileHandlers: UsersMobileHandlers = {
    onView: (userId: number) => {
      const user = users.find((u) => u.id === userId);
      if (user) openModal(user);
    },
    onEdit: (userId: number) => {
      const user = users.find((u) => u.id === userId);
      if (user) openModal(user);
    },
    onDelete: (userId: number) => {
      const user = users.find((u) => u.id === userId);
      if (user) toggleActive(user);
    },
  };

  const mobilePermissions = {
    canEdit: canManage,
    canDelete: canManage,
  };

  const filtersContent = (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {t('users.filters.role')}
      </label>
      <Select
        value={filters.role}
        onChange={(val) => handleFilterChange(String(val))}
        className="w-full"
        options={[{ label: t('users.filters.allRoles'), value: '' }, ...ROLE_OPTIONS]}
        placeholder={t('users.filters.allRoles')}
        allowClear
      />
    </div>
  );

  if (isMobile) {
    return (
      <div className="space-y-4 px-4 pb-6">
        <header className="flex items-center justify-between py-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t('users.title')}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('users.subtitle')}</p>
          </div>
          {canManage && (
            <button
              onClick={() => openModal()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-emerald-500 dark:text-slate-900"
            >
              {t('users.new')}
            </button>
          )}
        </header>

        <FilterTrigger onClick={() => setFiltersOpen(true)} />
        <FilterDrawer
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title={t('users.filters.title')}
        >
          {filtersContent}
        </FilterDrawer>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            {t('users.messages.loading')}
          </div>
        ) : (
          <UsersMobileCards
            data={users.map((u) => ({
              ...u,
              full_name: `${u.first_name} ${u.last_name}`.trim() || u.username,
            }))}
            handlers={mobileHandlers}
            permissions={mobilePermissions}
          />
        )}

        <PaginationControls
          page={page}
          pageSize={pageSize}
          total={total}
          setPage={setPage}
          setPageSize={setPageSize}
        />
      </div>
    );
  }

  return (
    <section className="page-wrapper space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('users.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('users.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={filters.role}
            onChange={(val) => handleFilterChange(String(val))}
            className="w-auto"
            options={[{ label: t('users.filters.allRoles'), value: '' }, ...ROLE_OPTIONS]}
            placeholder={t('users.filters.allRoles')}
            allowClear
          />
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
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      {user.is_online && (
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                        </span>
                      )}
                      <span className={user.archived_at ? 'text-slate-400 line-through' : ''}>{user.username}</span>
                      {user.archived_at && (
                        <span className="text-xs text-slate-400">({user.archived_reason_display})</span>
                      )}
                    </div>
                  </td>
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
                        {!user.archived_at && (
                          <>
                            <button
                              className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-300"
                              onClick={() => toggleActive(user)}
                            >
                              {user.is_active ? t('users.deactivate') : t('users.activate')}
                            </button>
                            <button
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-300"
                              onClick={() => openReplaceModal(user)}
                            >
                              {t('users.replace')}
                            </button>
                          </>
                        )}
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
              <Select
                value={form.role}
                onChange={(val) => setForm((prev) => ({ ...prev, role: String(val) }))}
                className="mt-1 w-full"
                options={ROLE_OPTIONS}
                placeholder={t('users.form.role')}
              />
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

      <Modal
        open={replaceModalOpen}
        onClose={() => {
          if (!submitting) {
            setReplaceModalOpen(false);
            setUserToReplace(null);
          }
        }}
        title={`${t('users.replaceTitle')} ${userToReplace?.username || ''}`}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setReplaceModalOpen(false);
                setUserToReplace(null);
              }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              form="replace-form"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? t('actions.saving') : t('users.replaceButton')}
            </button>
          </>
        }
      >
        <form id="replace-form" onSubmit={handleReplaceSubmit} className="space-y-4">
          <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            {t('users.replaceWarning')}
          </div>
          
          <div>
            <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">{t('users.newUserInfo')}</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('users.form.username')} *</label>
                <input
                  required
                  name="username"
                  value={replaceForm.username}
                  onChange={(e) => setReplaceForm({ ...replaceForm, username: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('users.form.password')} *</label>
                <input
                  required
                  type="password"
                  name="password"
                  value={replaceForm.password}
                  onChange={(e) => setReplaceForm({ ...replaceForm, password: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('users.form.firstName')}</label>
                <input
                  name="first_name"
                  value={replaceForm.first_name}
                  onChange={(e) => setReplaceForm({ ...replaceForm, first_name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('users.form.lastName')}</label>
                <input
                  name="last_name"
                  value={replaceForm.last_name}
                  onChange={(e) => setReplaceForm({ ...replaceForm, last_name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('users.form.email')}</label>
                <input
                  type="email"
                  name="email"
                  value={replaceForm.email}
                  onChange={(e) => setReplaceForm({ ...replaceForm, email: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('users.archiveReason')}</label>
            <Select
              value={replaceForm.archive_reason}
              onChange={(val) => setReplaceForm({ ...replaceForm, archive_reason: String(val) })}
              className="mt-1 w-full"
              options={[
                { label: t('users.archiveReasons.replaced'), value: 'replaced' },
                { label: t('users.archiveReasons.terminated'), value: 'terminated' },
                { label: t('users.archiveReasons.resigned'), value: 'resigned' },
                { label: t('users.archiveReasons.other'), value: 'other' },
              ]}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('users.comment')}</label>
            <textarea
              name="comment"
              value={replaceForm.comment}
              onChange={(e) => setReplaceForm({ ...replaceForm, comment: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder={t('users.commentPlaceholder')}
            />
          </div>
        </form>
      </Modal>
    </section>
  );
};

export default UsersPage;
