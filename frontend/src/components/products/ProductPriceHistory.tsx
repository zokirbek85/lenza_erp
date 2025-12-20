import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import http from '../../app/http';
import Modal from '../Modal';
import { formatCurrency } from '../../utils/formatters';
import { useAuthStore } from '../../auth/useAuthStore';

interface ProductPrice {
  id: number;
  price: string;
  currency: 'USD' | 'UZS';
  valid_from: string;
  created_at: string;
  created_by_name: string | null;
}

interface ProductPriceHistoryProps {
  productId: number;
  productSku: string;
  productName: string;
  onClose: () => void;
}

const ProductPriceHistory = ({ productId, productSku, productName, onClose }: ProductPriceHistoryProps) => {
  const role = useAuthStore((state) => state.role);
  const [prices, setPrices] = useState<ProductPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    price: '',
    currency: 'USD' as 'USD' | 'UZS',
    valid_from: new Date().toISOString().split('T')[0],
  });

  const canEdit = role === 'admin' || role === 'accountant';

  const fetchPrices = async () => {
    try {
      setLoading(true);
      const response = await http.get(`/catalog/product-prices/?product=${productId}`);
      setPrices(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to fetch price history:', error);
      toast.error('Failed to load price history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, [productId]);

  const handleAddPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    try {
      setSaving(true);
      await http.post('/catalog/product-prices/', {
        product: productId,
        price: parseFloat(formData.price),
        currency: formData.currency,
        valid_from: formData.valid_from,
      });
      
      toast.success('Price added successfully');
      setShowAddForm(false);
      setFormData({
        price: '',
        currency: 'USD',
        valid_from: new Date().toISOString().split('T')[0],
      });
      fetchPrices();
    } catch (error: any) {
      console.error('Failed to add price:', error);
      const errorMsg = error.response?.data?.valid_from?.[0] || 
                       error.response?.data?.detail ||
                       'Failed to add price';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Price History - ${productSku} (${productName})`}
      widthClass="max-w-4xl"
    >
      <div className="space-y-4">
        {/* Add Price Button */}
        {canEdit && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add New Price
          </button>
        )}

        {/* Add Price Form */}
        {showAddForm && (
          <form onSubmit={handleAddPrice} className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h3 className="font-semibold text-lg">
              New Price
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Currency *
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value as 'USD' | 'UZS' })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USD">USD</option>
                  <option value="UZS">UZS</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Valid From *
                </label>
                <input
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({
                    price: '',
                    currency: 'USD',
                    valid_from: new Date().toISOString().split('T')[0],
                  });
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        )}

        {/* Price History Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Loading...
            </div>
          ) : prices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No price history available
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Currency
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Valid From
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Created By
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {prices.map((price) => (
                  <tr key={price.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      {formatCurrency(parseFloat(price.price))}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-200 rounded text-xs font-semibold">
                        {price.currency}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {new Date(price.valid_from).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(price.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {price.created_by_name || 'System'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
          <div className="font-semibold mb-2">
            ℹ️ Important Information
          </div>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>
              Prices are applied based on the valid_from date
            </li>
            <li>
              Past orders keep their original prices and are never recalculated
            </li>
            <li>
              You can add prices for past dates, but they only affect future operations
            </li>
            <li>
              Cannot have duplicate prices for the same date
            </li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};

export default ProductPriceHistory;
