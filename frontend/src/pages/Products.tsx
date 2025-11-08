import type { ChangeEvent, FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

import { useAuthStore } from '../auth/useAuthStore';
import http from '../app/http';
import Modal from '../components/Modal';
import { downloadFile } from '../utils/download';
import { formatCurrency } from '../utils/formatters';
import { toArray } from '../utils/api';

interface Brand {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  sku: string;
  name: string;
  brand: Brand | null;
  category: Category | null;
  sell_price_usd: number;
  stock_ok: number;
  stock_defect: number;
  availability_status: string;
  brand_id?: number;
  category_id?: number;
}

const emptyForm = {
  sku: '',
  name: '',
  brand_id: '' as number | '',
  category_id: '' as number | '',
  sell_price_usd: '',
  stock_ok: '',
  stock_defect: '',
};

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formState, setFormState] = useState<typeof emptyForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [adjustForm, setAdjustForm] = useState({ stock_ok: '', stock_defect: '' });
  const [adjustSaving, setAdjustSaving] = useState(false);
  const { t } = useTranslation();
  const { role } = useAuthStore();
  const isWarehouse = role === 'warehouse';
  const canManageProducts = role === 'admin' || role === 'accountant';
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [productRes, brandRes, categoryRes] = await Promise.all([
        http.get('/api/products/'),
        http.get('/api/brands/'),
        http.get('/api/categories/'),
      ]);
      setProducts(toArray<Product>(productRes.data));
      setBrands(toArray<Brand>(brandRes.data));
      setCategories(toArray<Category>(categoryRes.data));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      sku: formState.sku,
      name: formState.name,
      brand_id: formState.brand_id || null,
      category_id: formState.category_id || null,
      sell_price_usd: Number(formState.sell_price_usd || 0),
      cost_usd: Number(formState.sell_price_usd || 0),
      stock_ok: Number(formState.stock_ok || 0),
      stock_defect: Number(formState.stock_defect || 0),
    };
    if (editingId) {
      await http.put(`/api/products/${editingId}/`, payload);
    } else {
      await http.post('/api/products/', payload);
    }
    setFormState(emptyForm);
    setEditingId(null);
    loadData();
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormState({
      sku: product.sku,
      name: product.name,
      brand_id: product.brand?.id ?? '',
      category_id: product.category?.id ?? '',
      sell_price_usd: String(product.sell_price_usd),
      stock_ok: String(product.stock_ok),
      stock_defect: String(product.stock_defect),
    });
  };

  const handleDelete = async (id: number) => {
    await http.delete(`/api/products/${id}/`);
    loadData();
  };

  const openAdjustModal = (product: Product) => {
    setAdjusting(product);
    setAdjustForm({
      stock_ok: String(product.stock_ok),
      stock_defect: String(product.stock_defect),
    });
  };

  const handleAdjustChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setAdjustForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdjustSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!adjusting) return;
    const payload: Record<string, number> = {};
    if (adjustForm.stock_ok !== '') {
      payload.stock_ok = Number(adjustForm.stock_ok);
    }
    if (adjustForm.stock_defect !== '') {
      payload.stock_defect = Number(adjustForm.stock_defect);
    }
    if (!Object.keys(payload).length) {
      toast.error('Enter at least one value');
      return;
    }
    setAdjustSaving(true);
    try {
      await http.patch(`/api/products/${adjusting.id}/adjust/`, payload);
      toast.success('Stock levels updated');
      setAdjusting(null);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to adjust stock');
    } finally {
      setAdjustSaving(false);
    }
  };

  const tableRows = useMemo(
    () =>
      products.map((product) => ({
        ...product,
        canSell: product.stock_ok > 0,
        availability: product.availability_status,
      })),
    [products]
  );

  const handleExportPdf = () => downloadFile('/api/catalog/report/pdf/', 'products.pdf');
  const handleExportExcel = async () => {
    try {
      await downloadFile('/api/products/export/excel/', `products_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Excel exported');
    } catch (error) {
      console.error(error);
      toast.error('Export failed');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadFile('/api/products/import/template/', 'products_import_template.xlsx');
      toast.success('Template downloaded');
    } catch (error) {
      console.error(error);
      toast.error('Template download failed');
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const toastId = toast.loading('Importing Excel...');
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await http.post('/api/products/import/excel/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const imported = response.data?.imported ?? 0;
      const updated = response.data?.updated ?? 0;
      toast.success(`✅ Imported: ${imported}, Updated: ${updated}`, { id: toastId });
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error('Import failed', { id: toastId });
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('nav.products')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('actions.save')} &middot; inventory monitoring
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportPdf}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            {t('actions.exportPdf')}
          </button>
          {canManageProducts && (
            <>
              <button
                onClick={handleExportExcel}
                className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                📤 Export Excel
              </button>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                📄 Import Template
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {importing ? 'Loading…' : '📥 Import Excel'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleFileChange}
                disabled={importing}
              />
            </>
          )}
        </div>
      </header>

      {canManageProducts && (
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2"
        >
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">SKU</label>
          <input
            required
            name="sku"
            value={formState.sku}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('nav.products')}</label>
          <input
            required
            name="name"
            value={formState.name}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Brend</label>
          <select
            name="brand_id"
            value={formState.brand_id}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">Tanlang</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Kategoriya</label>
          <select
            name="category_id"
            value={formState.category_id}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">Tanlang</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Sotuv narxi (USD)</label>
          <input
            name="sell_price_usd"
            value={formState.sell_price_usd}
            onChange={handleChange}
            type="number"
            step="0.01"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Sog&apos;lom zaxira</label>
            <input
              name="stock_ok"
              value={formState.stock_ok}
              onChange={handleChange}
              type="number"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Defekt zaxira</label>
            <input
              name="stock_defect"
              value={formState.stock_defect}
              onChange={handleChange}
              type="number"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white transition hover:bg-slate-700 dark:bg-emerald-500 dark:text-slate-900 md:w-auto"
          >
            {editingId ? t('actions.save') : t('actions.create')}
          </button>
          {editingId && (
            <button
              type="button"
              className="ml-3 text-sm text-slate-500 dark:text-slate-300"
              onClick={() => {
                setEditingId(null);
                setFormState(emptyForm);
              }}
            >
              {t('actions.cancel')}
            </button>
          )}
        </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">{t('nav.products')}</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">Brend</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">Kategoriya</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">Narx</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">Zaxira</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">Availability</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-200">{t('actions.save')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {tableRows.map((product) => (
              <tr key={product.id} className={product.canSell ? '' : 'bg-rose-50/70 dark:bg-rose-900/30'}>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900 dark:text-white">{product.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{product.sku}</div>
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{product.brand?.name ?? '—'}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{product.category?.name ?? '—'}</td>
                <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{formatCurrency(product.sell_price_usd)}</td>
                <td className="px-4 py-3">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Ok: {product.stock_ok} / Defect: {product.stock_defect}
                  </div>
                  {!product.canSell && (
                    <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">
                      Zaxira yo&apos;q
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
                      product.canSell
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200'
                    }`}
                  >
                    {product.availability}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {canManageProducts && (
                      <button
                        className="text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                        onClick={() => handleEdit(product)}
                      >
                        Tahrirlash
                      </button>
                    )}
                    {isWarehouse && (
                      <button
                        className="text-sm font-semibold text-amber-600 hover:text-amber-800 dark:text-amber-300"
                        onClick={() => openAdjustModal(product)}
                      >
                        Adjust
                      </button>
                    )}
                    {canManageProducts && (
                      <button
                        className="text-sm font-semibold text-rose-600 hover:text-rose-800"
                        onClick={() => handleDelete(product.id)}
                      >
                        O&apos;chirish
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-300">
                  Mahsulotlar mavjud emas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={Boolean(adjusting)}
        onClose={() => {
          if (!adjustSaving) {
            setAdjusting(null);
            setAdjustForm({ stock_ok: '', stock_defect: '' });
          }
        }}
        title="Adjust stock"
        footer={
          <>
            <button
              type="button"
              onClick={() => setAdjusting(null)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="adjust-form"
              disabled={adjustSaving}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60 dark:bg-emerald-500 dark:text-slate-900"
            >
              {adjustSaving ? 'Saving…' : 'Update'}
            </button>
          </>
        }
      >
        <form id="adjust-form" onSubmit={handleAdjustSubmit} className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-300">
            {adjusting ? `Update ${adjusting.name} stock levels.` : 'Select product'}
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Stock OK</label>
              <input
                name="stock_ok"
                value={adjustForm.stock_ok}
                onChange={handleAdjustChange}
                type="number"
                min="0"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Stock Defect</label>
              <input
                name="stock_defect"
                value={adjustForm.stock_defect}
                onChange={handleAdjustChange}
                type="number"
                min="0"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
        </form>
      </Modal>
    </section>
  );
};

export default ProductsPage;
