import { useEffect, useState } from 'react';

import http from '../app/http';
import { formatCurrency, formatNumber } from '../utils/formatters';

interface OwnerKpi {
  total_sales_usd: number;
  total_payments_usd: number;
  top_dealers: { dealer: string; total_usd: number }[];
  balances: { dealer: string; balance_usd: number }[];
}

interface WarehouseKpi {
  low_stock: { sku: string; name: string; stock_ok: number }[];
  defect_stock: { sku: string; name: string; stock_defect: number }[];
}

const KpiPage = () => {
  const [ownerData, setOwnerData] = useState<OwnerKpi | null>(null);
  const [warehouseData, setWarehouseData] = useState<WarehouseKpi | null>(null);

  useEffect(() => {
    const load = async () => {
      const [ownerRes, warehouseRes] = await Promise.all([
        http.get<OwnerKpi>('/api/kpis/owner/'),
        http.get<WarehouseKpi>('/api/kpis/warehouse/'),
      ]);
      setOwnerData(ownerRes.data);
      setWarehouseData(warehouseRes.data);
    };
    load();
  }, []);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">KPI hisobotlari</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Moliyaviy va logistika ko&apos;rsatkichlari.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-sm text-slate-500 dark:text-slate-400">Savdo (USD)</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
            {formatCurrency(ownerData?.total_sales_usd ?? 0)}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-sm text-slate-500 dark:text-slate-400">To&apos;lovlar</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
            {formatCurrency(ownerData?.total_payments_usd ?? 0)}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-sm text-slate-500 dark:text-slate-400">Dilerlar soni</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
            {ownerData?.balances.length ?? 0}
          </p>
        </article>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Top dilerlar</h2>
          <div className="space-y-3">
            {ownerData?.top_dealers.map((dealer) => (
              <div key={dealer.dealer} className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{dealer.dealer}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Savdo</p>
                </div>
                <p className="font-semibold text-slate-900 dark:text-white">{formatCurrency(dealer.total_usd)}</p>
              </div>
            )) ?? <p className="text-sm text-slate-500 dark:text-slate-400">Ma&apos;lumot topilmadi</p>}
          </div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Balanslar</h2>
          <div className="space-y-2">
            {ownerData?.balances.map((balance) => (
              <div key={balance.dealer} className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">{balance.dealer}</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(balance.balance_usd)}
                </span>
              </div>
            )) ?? <p className="text-sm text-slate-500 dark:text-slate-400">Ma&apos;lumot topilmadi</p>}
          </div>
        </article>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Past zaxiralar</h2>
          <div className="space-y-2 text-sm">
            {warehouseData?.low_stock.map((item) => (
              <div key={item.sku} className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{item.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.sku}</p>
                </div>
                <span className="font-semibold text-amber-600">{formatNumber(item.stock_ok)} dona</span>
              </div>
            )) ?? <p className="text-sm text-slate-500 dark:text-slate-400">Yuqori xavfli zaxira yo&apos;q</p>}
          </div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Defektlar</h2>
          <div className="space-y-2 text-sm">
            {warehouseData?.defect_stock.map((item) => (
              <div key={item.sku} className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{item.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.sku}</p>
                </div>
                <span className="font-semibold text-rose-600">{formatNumber(item.stock_defect)} dona</span>
              </div>
            )) ?? <p className="text-sm text-slate-500 dark:text-slate-400">Defekt mahsulotlar yo&apos;q</p>}
          </div>
        </article>
      </div>
    </section>
  );
};

export default KpiPage;
