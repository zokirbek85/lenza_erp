import type { ChangeEvent, FormEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import http from '../app/http';
import Modal from '../components/Modal';
import { toArray } from '../utils/api';
import { formatCurrency } from '../utils/formatters';

interface Region {
  id: number;
  name: string;
}

interface Manager {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
}

interface Dealer {
  id: number;
  name: string;
  code: string;
  contact: string;
  opening_balance_usd: number;
  region: Region | null;
  region_id?: number | null;
  manager_user?: string | null;
  manager_user_id?: number | null;
  balance: string | number;
}

interface OrderSummary {
  id: number;
  display_no: string;
  status: string;
  total_usd: number;
  value_date: string;
}

interface PaymentSummary {
  id: number;
  pay_date: string;
  amount: number;
  currency: string;
  method: string;
}

const emptyForm = {
  name: '',
  code: '',
  contact: '',
  opening_balance_usd: '',
  region_id: '' as number | '',
  manager_user_id: '' as number | '',
};

const DealersPage = () => {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [filter, setFilter] = useState({ region_id: '' });
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editing, setEditing] = useState<Dealer | null>(null);
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [payments, setPayments] = useState<PaymentSummary[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadDealers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await http.get('/api/dealers/', {
        params: filter.region_id ? { region_id: filter.region_id } : undefined,
      });
      setDealers(toArray<Dealer>(response.data));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load dealers');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const loadRegions = useCallback(async () => {
    try {
      const response = await http.get('/api/regions/');
      setRegions(toArray<Region>(response.data));
    } catch (error) {
      console.error(error);
    }
  }, []);

  const loadManagers = useCallback(async () => {
    try {
      const response = await http.get('/api/users/', { params: { role: 'sales' } });
      setManagers(toArray<Manager>(response.data));
    } catch (error) {
      console.warn('Unable to load managers', error);
    }
  }, []);

  useEffect(() => {
    loadRegions();
    loadManagers();
  }, [loadRegions, loadManagers]);

  useEffect(() => {
    loadDealers();
  }, [loadDealers]);

  const handleFilterChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setFilter({ region_id: event.target.value });
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openModal = (dealer?: Dealer) => {
    if (dealer) {
      setEditing(dealer);
      setForm({
        name: dealer.name,
        code: dealer.code,
        contact: dealer.contact || '',
        opening_balance_usd: String(dealer.opening_balance_usd ?? 0),
        region_id: dealer.region?.id ?? '',
        manager_user_id: dealer.manager_user_id ?? '',
      });
    } else {
      setEditing(null);
      setForm(emptyForm);
    }
    setModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      code: form.code,
      contact: form.contact,
      opening_balance_usd: Number(form.opening_balance_usd || 0),
      region_id: form.region_id || null,
      manager_user_id: form.manager_user_id || null,
    };
    try {
      if (editing) {
        await http.put(`/api/dealers/${editing.id}/`, payload);
        toast.success('Dealer updated');
      } else {
        await http.post('/api/dealers/', payload);
        toast.success('Dealer created');
      }
      setModalOpen(false);
      setForm(emptyForm);
      setEditing(null);
      loadDealers();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save dealer');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dealer: Dealer) => {
    if (!window.confirm(`Delete dealer "${dealer.name}"?`)) return;
    try {
      await http.delete(`/api/dealers/${dealer.id}/`);
      toast.success('Dealer removed');
      loadDealers();
    } catch (error) {
      console.error(error);
      toast.error('Unable to delete dealer');
    }
  };

  const openDetails = async (dealer: Dealer) => {
    setSelectedDealer(dealer);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const [ordersRes, paymentsRes] = await Promise.all([
        http.get('/api/orders/', { params: { dealer: dealer.id, ordering: '-created_at' } }),
        http.get('/api/payments/', { params: { dealer: dealer.id, ordering: '-pay_date' } }),
      ]);
      setOrders(toArray<OrderSummary>(ordersRes.data));
      setPayments(toArray<PaymentSummary>(paymentsRes.data));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load dealer history');
    } finally {
      setDetailLoading(false);
    }
  };

  const managerLabel = (manager?: Dealer['manager_user']) => manager ?? '—';

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Dealers</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Region-based partner management.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filter.region_id}
            onChange={handleFilterChange}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="">All regions</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => openModal()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-emerald-500 dark:text-slate-900"
          >
            Add dealer
          </button>
        </div>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/40">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Dealer</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Region</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Manager</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">Balance (USD)</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                  Loading dealers...
                </td>
              </tr>
            )}
            {!loading &&
              dealers.map((dealer) => {
                const rawBalance = typeof dealer.balance === 'string' ? parseFloat(dealer.balance) : dealer.balance ?? 0;
                const balanceValue = Number.isFinite(rawBalance) ? rawBalance : 0;
                const balanceClass =
                  balanceValue < 0
                    ? 'text-rose-600 dark:text-rose-300'
                    : balanceValue > 0
                      ? 'text-emerald-600 dark:text-emerald-300'
                      : 'text-slate-600 dark:text-slate-200';
                return (
                  <tr key={dealer.id}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{dealer.name}</div>
                      <p className="text-xs text-slate-500">{dealer.code}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-200">{dealer.region?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-200">{managerLabel(dealer.manager_user)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${balanceClass}`}>
                      {formatCurrency(balanceValue ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button className="text-slate-600 hover:text-slate-900 dark:text-slate-300" onClick={() => openDetails(dealer)}>
                          View details
                        </button>
                        <button className="text-slate-600 hover:text-slate-900 dark:text-slate-300" onClick={() => openModal(dealer)}>
                          Edit
                        </button>
                        <button className="text-rose-600 hover:text-rose-800 dark:text-rose-300" onClick={() => handleDelete(dealer)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            {!loading && dealers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                  No dealers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          if (!saving) {
            setModalOpen(false);
            setForm(emptyForm);
            setEditing(null);
          }
        }}
        title={editing ? 'Edit dealer' : 'Add dealer'}
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
              Cancel
            </button>
            <button
              type="submit"
              form="dealer-form"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60 dark:bg-emerald-500 dark:text-slate-900"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <form id="dealer-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Name</label>
              <input
                required
                name="name"
                value={form.name}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Code</label>
              <input
                required
                name="code"
                value={form.code}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Contact</label>
            <input
              name="contact"
              value={form.contact}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Region</label>
              <select
                name="region_id"
                value={form.region_id}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Select region</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Manager</label>
              <select
                name="manager_user_id"
                value={form.manager_user_id}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Unassigned</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.first_name || manager.last_name ? `${manager.first_name} ${manager.last_name}`.trim() : manager.username}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Opening balance (USD)</label>
            <input
              type="number"
              step="0.01"
              name="opening_balance_usd"
              value={form.opening_balance_usd}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setOrders([]);
          setPayments([]);
        }}
        title={selectedDealer ? `${selectedDealer.name} overview` : 'Dealer overview'}
        widthClass="max-w-4xl"
      >
        {detailLoading && <p className="text-sm text-slate-500">Loading details...</p>}
        {!detailLoading && selectedDealer && (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Recent orders</h4>
              {orders.length === 0 && <p className="text-sm text-slate-500">No orders found</p>}
              {orders.length > 0 && (
                <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                  {orders.slice(0, 5).map((order) => (
                    <li key={order.id} className="flex items-center justify-between px-4 py-2 text-sm">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{order.display_no}</p>
                        <p className="text-xs uppercase tracking-widest text-slate-500">Status: {order.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900 dark:text-white">{formatCurrency(order.total_usd)}</p>
                        <p className="text-xs text-slate-500">{order.value_date}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Recent payments</h4>
              {payments.length === 0 && <p className="text-sm text-slate-500">No payments found</p>}
              {payments.length > 0 && (
                <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                  {payments.slice(0, 5).map((payment) => (
                    <li key={payment.id} className="flex items-center justify-between px-4 py-2 text-sm">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {payment.amount.toFixed(2)} {payment.currency}
                        </p>
                        <p className="text-xs uppercase tracking-widest text-slate-500">{payment.method}</p>
                      </div>
                      <p className="text-xs text-slate-500">{payment.pay_date}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
};

export default DealersPage;
