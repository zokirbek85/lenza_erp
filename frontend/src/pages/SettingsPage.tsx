import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import http from '../app/http';
import { useAuthStore } from '../auth/useAuthStore';

interface SystemConfig {
  LOW_STOCK_THRESHOLD: number;
  BACKUP_PATH: string;
  DEFAULT_EXCHANGE_RATE: string;
  [key: string]: unknown;
}

const SettingsPage = () => {
  const { role } = useAuthStore();
  const [telegramId, setTelegramId] = useState('');
  const [connected, setConnected] = useState(false);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const isAdmin = role === 'admin';

  useEffect(() => {
    const fetchLink = async () => {
      try {
        const response = await http.get<{ telegram_id: string | null }>('/api/telegram/link/');
        if (response.data.telegram_id) {
          setTelegramId(response.data.telegram_id);
          setConnected(true);
        }
      } catch (error) {
        console.warn(error);
      }
    };
    fetchLink();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const loadConfig = async () => {
      const response = await http.get<SystemConfig>('/api/system/config/');
      setConfig(response.data);
    };
    loadConfig();
  }, [isAdmin]);

  const handleTelegramSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await http.post('/api/telegram/link/', { telegram_id: telegramId });
      toast.success('Telegram linked');
      setConnected(true);
    } catch (error) {
      toast.error('Telegram linking failed');
    }
  };

  const handleConfigSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!config) return;
    try {
      const response = await http.put<SystemConfig>('/api/system/config/', config);
      setConfig(response.data);
      toast.success('Configuration updated');
    } catch (error) {
      toast.error('Failed to update config');
    }
  };

  return (
    <section className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Telegram</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Link your Telegram account to receive bot notifications.</p>
        <form onSubmit={handleTelegramSubmit} className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Telegram ID</label>
            <input
              value={telegramId}
              onChange={(event) => setTelegramId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder="123456789"
            />
          </div>
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-white dark:bg-emerald-500 dark:text-slate-900" type="submit">
            {connected ? 'Connected ✅' : 'Connect'}
          </button>
        </form>
      </div>

      {isAdmin && config && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">System Configuration</h2>
          <form onSubmit={handleConfigSubmit} className="mt-4 space-y-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Low stock threshold
              <input
                type="number"
                value={config.LOW_STOCK_THRESHOLD as number}
                onChange={(event) => setConfig({ ...config, LOW_STOCK_THRESHOLD: Number(event.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Backup path
              <input
                type="text"
                value={config.BACKUP_PATH as string}
                onChange={(event) => setConfig({ ...config, BACKUP_PATH: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Default exchange rate
              <input
                type="number"
                value={config.DEFAULT_EXCHANGE_RATE as string}
                onChange={(event) => setConfig({ ...config, DEFAULT_EXCHANGE_RATE: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-white dark:bg-emerald-500 dark:text-slate-900" type="submit">
              Save
            </button>
          </form>
        </div>
      )}
    </section>
  );
};

export default SettingsPage;
