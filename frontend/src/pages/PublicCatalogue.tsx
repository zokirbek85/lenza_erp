import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface SizeStock {
  size: string;
  stock: number;
}

interface Variant {
  id: number;
  model: string;
  brand: string;
  color: string;
  door_type: string;
  door_type_display: string;
  image: string;
  sizes: SizeStock[];
}

export default function PublicCatalogue() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVariants = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/api/public/catalog/variants/`);
        setVariants(response.data.results || response.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch variants:', err);
        setError('Mahsulotlarni yuklashda xatolik yuz berdi');
      } finally {
        setLoading(false);
      }
    };

    fetchVariants();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0E14] flex items-center justify-center">
        <div className="text-white text-xl">Yuklanmoqda...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0E14] flex items-center justify-center">
        <div className="text-red-400 text-xl">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0E14]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0A0E14] to-[#1A1F29] border-b border-gray-800 py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl font-bold text-white mb-3">Lenza Katalogi</h1>
          <p className="text-gray-400 text-lg">Yuqori sifatli eshiklar va aksessuarlar</p>
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {variants.map((variant) => (
            <div
              key={variant.id}
              className="group relative w-full rounded-xl bg-[#1A1F29] border border-transparent hover:border-[#2f89ff] overflow-hidden transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-blue-500/10"
            >
              {/* Image Container */}
              <div className="h-[260px] bg-[#0F1419] flex items-center justify-center p-4 overflow-hidden">
                <img
                  src={variant.image}
                  alt={`${variant.brand} ${variant.model}`}
                  className="max-h-full max-w-full w-auto h-auto object-contain group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>

              {/* Info Container */}
              <div className="p-4">
                {/* Model Name */}
                <h3 className="text-white text-lg font-semibold mb-1 truncate">
                  {variant.model}
                </h3>

                {/* Brand & Details */}
                <div className="flex flex-wrap items-center gap-2 text-gray-400 text-sm mb-3">
                  <span className="font-medium text-gray-300">{variant.brand}</span>
                  <span className="text-gray-600">•</span>
                  <span>{variant.color}</span>
                  <span className="text-gray-600">•</span>
                  <span>{variant.door_type_display}</span>
                </div>

                {/* Sizes with Stock */}
                {variant.sizes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {variant.sizes.map((item, idx) => (
                      <div
                        key={idx}
                        className="px-2 py-1 bg-[#232936] text-gray-200 text-xs rounded hover:bg-[#2A2D30] transition-colors flex flex-col items-center gap-0.5"
                      >
                        <span className="font-medium">{item.size}</span>
                        <span className="text-[10px] text-gray-400">
                          {item.stock > 0 ? `${item.stock} dona` : 'Tugagan'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {variants.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-xl">Hech qanday mahsulot topilmadi</p>
          </div>
        )}
      </div>
    </div>
  );
}
