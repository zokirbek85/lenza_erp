import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import {
  createInbound,
  fetchInbound,
  updateInbound,
  type InboundItem,
  type InboundPayload,
} from '../api/inboundApi';
import { fetchProductsByCategory, type Product } from '../api/productsApi';
import http from '../app/http';

type Brand = {
  id: number;
  name: string;
};

const InboundFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    brand: '',
    date: new Date().toISOString().split('T')[0],
    comment: '',
  });

  const [items, setItems] = useState<InboundItem[]>([]);
  const [currentItem, setCurrentItem] = useState<InboundItem>({
    product: 0,
    quantity: 1,
  });

  // Load brands
  useEffect(() => {
    const loadBrands = async () => {
      try {
        const response = await http.get<Brand[]>('/brands/');
        setBrands(response.data);
      } catch (error) {
        console.error('Error loading brands:', error);
        toast.error('Failed to load brands');
      }
    };
    loadBrands();
  }, []);

  // Load existing inbound for edit
  useEffect(() => {
    if (isEdit && id) {
      const loadInbound = async () => {
        setLoading(true);
        try {
          const inbound = await fetchInbound(Number(id));
          console.log('Loaded inbound:', inbound);
          console.log('Inbound items:', inbound.items);
          console.log('Is items array?', Array.isArray(inbound.items));
          
          if (inbound.status === 'confirmed') {
            toast.error('Cannot edit confirmed inbound');
            navigate('/products/inbounds');
            return;
          }
          setFormData({
            brand: String(inbound.brand),
            date: inbound.date,
            comment: inbound.comment || '',
          });
          
          // Ensure items is an array before mapping
          const itemsArray = Array.isArray(inbound.items) ? inbound.items : [];
          console.log('Setting items:', itemsArray.length);
          setItems(itemsArray.map((item) => ({
            id: item.id,
            product: item.product,
            quantity: item.quantity,
          })));
        } catch (error) {
          console.error('Error loading inbound:', error);
          toast.error('Failed to load inbound');
          navigate('/products/inbounds');
        } finally {
          setLoading(false);
        }
      };
      loadInbound();
    }
  }, [id, isEdit, navigate]);

  // Load products when brand changes
  useEffect(() => {
    if (formData.brand) {
      const loadProducts = async () => {
        setLoadingProducts(true);
        try {
          const result = await fetchProductsByCategory({ brandId: formData.brand });
          
          // Debug: log the response
          console.log('Products API response:', result);
          console.log('Is array?', Array.isArray(result));
          
          // Ensure we always set an array
          const productsArray = Array.isArray(result) ? result : [];
          console.log('Setting products:', productsArray.length, 'items');
          setProducts(productsArray);
        } catch (error) {
          console.error('Error loading products:', error);
          toast.error('Failed to load products');
          setProducts([]);
        } finally {
          setLoadingProducts(false);
        }
      };
      loadProducts();
    } else {
      setProducts([]);
    }
  }, [formData.brand]);

  const handleAddItem = () => {
    if (!currentItem.product || currentItem.quantity <= 0) {
      toast.error('Please select a product and enter quantity');
      return;
    }

    // Check if product already exists
    if (Array.isArray(items) && items.some((item) => item.product === currentItem.product)) {
      toast.error('Product already added to this inbound');
      return;
    }

    setItems([...(Array.isArray(items) ? items : []), { ...currentItem }]);
    setCurrentItem({ product: 0, quantity: 1 });
  };

  const handleRemoveItem = (index: number) => {
    setItems(Array.isArray(items) ? items.filter((_, i) => i !== index) : []);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.brand) {
      toast.error('Please select a supplier');
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      toast.error('Please add at least one product');
      return;
    }

    setSaving(true);
    try {
      const payload: InboundPayload = {
        brand: Number(formData.brand),
        date: formData.date,
        comment: formData.comment,
        items: items.map((item) => ({
          product: item.product,
          quantity: item.quantity,
        })),
      };

      if (isEdit && id) {
        await updateInbound(Number(id), payload);
        toast.success('Inbound updated successfully');
      } else {
        await createInbound(payload);
        toast.success('Inbound created successfully');
      }

      navigate('/products/inbounds');
    } catch (error: any) {
      console.error('Error saving inbound:', error);
      const message = error?.response?.data?.detail || 'Failed to save inbound';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const getProductName = (productId: number) => {
    const product = products.find((p) => p.id === productId);
    return product ? `${product.name} (${product.sku})` : 'Unknown';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500 dark:text-gray-400">Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isEdit ? 'Kirimni tahrirlash' : 'Yangi kirim'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Asosiy ma'lumot</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Yetkazib beruvchi *
              </label>
              <select
                value={formData.brand}
                onChange={(e) => {
                  setFormData({ ...formData, brand: e.target.value });
                  setItems([]); // Clear items when brand changes
                }}
                disabled={isEdit}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
              >
                <option value="">Tanlang...</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sana *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Izoh
            </label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Qo'shimcha ma'lumot..."
            />
          </div>
        </div>

        {/* Add Items */}
        {formData.brand && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Mahsulotlarni qo'shish
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mahsulot
                </label>
                <select
                  value={currentItem.product}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, product: Number(e.target.value) })
                  }
                  disabled={loadingProducts}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value={0}>
                    {loadingProducts ? 'Yuklanmoqda...' : 'Mahsulot tanlang...'}
                  </option>
                  {Array.isArray(products) && products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Miqdor
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    value={currentItem.quantity}
                    onChange={(e) =>
                      setCurrentItem({ ...currentItem, quantity: Number(e.target.value) })
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Items List */}
            {items.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Qo'shilgan mahsulotlar ({items.length})
                </h3>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                          Mahsulot
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                          Miqdor
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                          Amallar
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                            {getProductName(item.product)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 text-sm"
                            >
                              O'chirish
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                  Jami miqdor: {Array.isArray(items) ? items.reduce((sum, item) => sum + item.quantity, 0) : 0}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/products/inbounds')}
            disabled={saving}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            disabled={saving || items.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InboundFormPage;
