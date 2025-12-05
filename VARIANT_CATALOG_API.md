# Variant-Based Catalog API Documentation

## 📌 Umumiy ma'lumot

Lenza ERP katalog tizimi variant-based arxitekturada qayta yozildi. Eski ierarxik tuzilma (Brand → Collection → Model → Color → Type → Size) o'rniga 3 bosqichli sodda tizim joriy qilindi:

```
ProductModel (Brand + Collection + Model Name)
    ↓
ProductVariant (Model + Color + Door Type) ← KATALOG KARTASI
    ↓
ProductSKU (Variant + Size → Product)
```

**Asosiy printsip:** Variant - bu katalog kartasining asosiy birligi. Har bir variant o'ziga tegishli barcha SKU lardan minimal narx va hajm/sklad ma'lumotlarini agregatsiya qiladi.

---

## 🎯 Backend API

### Base URL
```
http://127.0.0.1:8000/api/catalog/
```

### 1. **GET /api/catalog/variants/** - Asosiy katalog API
Barcha variantlarni ro'yxatini qaytaradi, har biri o'z hajm va sklad ma'lumotlari bilan.

#### Response format:
```json
[
  {
    "id": 512,
    "brand": "ДУБРАВА СИБИРЬ",
    "collection": "Эмалит",
    "model": "Бета Софт",
    "color": "тач-серый",
    "door_type": "ПГ",
    "door_type_display": "ПГ (Полотно глухое)",
    "image": "http://127.0.0.1:8000/media/catalog/variants/beta_soft_gray.jpg",
    "price_usd": 102.50,
    "price_uzs": 1250000.00,
    "sizes": [
      {"size": "400мм", "stock": 0},
      {"size": "600мм", "stock": 3},
      {"size": "700мм", "stock": 12},
      {"size": "800мм", "stock": 5},
      {"size": "900мм", "stock": 0}
    ]
  },
  ...
]
```

#### Query parameters:
- `brand` - Brend ID (filter)
- `collection` - Kolleksiya nomi (search)
- `model` - Model ID (filter)
- `color` - Rang (search)
- `door_type` - Eshik turi (`ПГ`, `ПО`, `ПДО`, `ПДГ`)
- `size` - Hajm (filter SKU larga qarab)
- `search` - Umumiy qidiruv (model, rang, kolleksiya bo'yicha)
- `ordering` - Saralash (`price_usd`, `-price_usd`, `brand`, `color`)

#### Misollar:
```bash
# Barcha variantlar
GET /api/catalog/variants/

# Faqat ПГ (glukh eshiklar)
GET /api/catalog/variants/?door_type=ПГ

# Ma'lum brend va rangli
GET /api/catalog/variants/?brand=5&color=белый

# 700mm o'lchamli variantlar
GET /api/catalog/variants/?size=700мм

# Qidiruv
GET /api/catalog/variants/?search=Бета
```

---

### 2. **GET /api/catalog/variants/filters/** - Filter variantlari
Mavjud filterlar ro'yxatini qaytaradi.

#### Response format:
```json
{
  "brands": [
    {"id": 1, "name": "ДУБРАВА СИБИРЬ"},
    {"id": 2, "name": "PROFILO PORTE"}
  ],
  "collections": [
    "Эмалит",
    "Вертикаль",
    "50001/50002"
  ],
  "models": [
    {"id": 15, "name": "Бета Софт"},
    {"id": 16, "name": "Имидж Эмалит белый"}
  ],
  "colors": [
    "тач-серый",
    "белый",
    "жасмин",
    "орех"
  ],
  "door_types": [
    {"value": "ПГ", "display": "ПГ (Полотно глухое)"},
    {"value": "ПО", "display": "ПО (Полотно остекленное)"},
    {"value": "ПДО", "display": "ПДО (Полотно деглухое остекленное)"},
    {"value": "ПДГ", "display": "ПДГ (Полотно деглухое глухое)"}
  ],
  "sizes": [
    "400мм", "600мм", "700мм", "800мм", "900мм",
    "20-6", "20-7", "20-8", "20-9",
    "21-6", "21-7", "21-8", "21-9"
  ]
}
```

---

### 3. **GET /api/catalog/models/** - Model ma'lumotlari
ProductModel larni boshqarish (admin uchun).

---

### 4. **GET /api/catalog/skus/** - SKU ma'lumotlari
ProductSKU larni boshqarish (admin uchun).

---

## 💻 Frontend implementatsiyasi (React + TypeScript)

### TypeScript interfeysi:

```typescript
// src/types/catalog.ts

export interface CatalogVariant {
  id: number;
  brand: string;
  collection: string;
  model: string;
  color: string;
  door_type: 'ПГ' | 'ПО' | 'ПДО' | 'ПДГ';
  door_type_display: string;
  image: string | null;
  price_usd: number;
  price_uzs: number;
  sizes: VariantSize[];
}

export interface VariantSize {
  size: string;
  stock: number;
}

export interface CatalogFilters {
  brands: Array<{id: number; name: string}>;
  collections: string[];
  models: Array<{id: number; name: string}>;
  colors: string[];
  door_types: Array<{value: string; display: string}>;
  sizes: string[];
}

export interface CatalogQueryParams {
  brand?: number;
  collection?: string;
  model?: number;
  color?: string;
  door_type?: string;
  size?: string;
  search?: string;
  ordering?: string;
}
```

---

### API Service:

```typescript
// src/services/catalogService.ts

import axios from 'axios';
import { CatalogVariant, CatalogFilters, CatalogQueryParams } from '@/types/catalog';

const API_BASE = 'http://127.0.0.1:8000/api/catalog';

export const catalogService = {
  // Barcha variantlarni olish
  async getVariants(params?: CatalogQueryParams): Promise<CatalogVariant[]> {
    const response = await axios.get(`${API_BASE}/variants/`, { params });
    return response.data;
  },

  // Filter variantlarini olish
  async getFilters(): Promise<CatalogFilters> {
    const response = await axios.get(`${API_BASE}/variants/filters/`);
    return response.data;
  },

  // Bitta variantni olish
  async getVariant(id: number): Promise<CatalogVariant> {
    const response = await axios.get(`${API_BASE}/variants/${id}/`);
    return response.data;
  },
};
```

---

### React komponent (Katalog sahifasi):

```tsx
// src/pages/CatalogPage.tsx

import React, { useState, useEffect } from 'react';
import { catalogService } from '@/services/catalogService';
import { CatalogVariant, CatalogFilters, CatalogQueryParams } from '@/types/catalog';
import VariantCard from '@/components/catalog/VariantCard';
import CatalogFiltersPanel from '@/components/catalog/CatalogFiltersPanel';

const CatalogPage: React.FC = () => {
  const [variants, setVariants] = useState<CatalogVariant[]>([]);
  const [filters, setFilters] = useState<CatalogFilters | null>(null);
  const [params, setParams] = useState<CatalogQueryParams>({});
  const [loading, setLoading] = useState(true);

  // Filterlar va variantlarni yuklash
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [variantsData, filtersData] = await Promise.all([
          catalogService.getVariants(params),
          catalogService.getFilters(),
        ]);
        setVariants(variantsData);
        setFilters(filtersData);
      } catch (error) {
        console.error('Katalog yuklashda xato:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [params]);

  // Filter o'zgartirish
  const handleFilterChange = (newParams: CatalogQueryParams) => {
    setParams({ ...params, ...newParams });
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Yuklanmoqda...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Eshiklar katalogi</h1>

      <div className="flex gap-6">
        {/* Filter paneli */}
        <aside className="w-64 flex-shrink-0">
          {filters && (
            <CatalogFiltersPanel
              filters={filters}
              activeParams={params}
              onChange={handleFilterChange}
            />
          )}
        </aside>

        {/* Variantlar ro'yxati */}
        <main className="flex-1">
          {variants.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              Hech qanday variant topilmadi
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {variants.map((variant) => (
                <VariantCard key={variant.id} variant={variant} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default CatalogPage;
```

---

### Variant kartasi komponenti:

```tsx
// src/components/catalog/VariantCard.tsx

import React from 'react';
import { CatalogVariant } from '@/types/catalog';

interface VariantCardProps {
  variant: CatalogVariant;
}

const VariantCard: React.FC<VariantCardProps> = ({ variant }) => {
  // Faqat skladda bor hajmlarni ko'rsatish
  const availableSizes = variant.sizes.filter((s) => s.stock > 0);

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      {/* Rasm */}
      <div className="aspect-square bg-gray-100 relative">
        {variant.image ? (
          <img
            src={variant.image}
            alt={`${variant.model} ${variant.color}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Rasm yo'q
          </div>
        )}
      </div>

      {/* Ma'lumotlar */}
      <div className="p-4">
        {/* Brend va kolleksiya */}
        <div className="text-xs text-gray-500 mb-1">
          {variant.brand} • {variant.collection}
        </div>

        {/* Model nomi */}
        <h3 className="text-lg font-semibold mb-1">{variant.model}</h3>

        {/* Rang va tur */}
        <div className="text-sm text-gray-600 mb-3">
          {variant.color} • {variant.door_type_display}
        </div>

        {/* Narx */}
        <div className="mb-3">
          <div className="text-2xl font-bold text-blue-600">
            ${variant.price_usd}
          </div>
          <div className="text-sm text-gray-500">
            {variant.price_uzs.toLocaleString()} so'm
          </div>
        </div>

        {/* Hajmlar jadval */}
        <div className="border-t pt-3">
          <div className="text-xs font-semibold text-gray-700 mb-2">
            Mavjud o'lchamlar:
          </div>
          {availableSizes.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {availableSizes.map((size) => (
                <div
                  key={size.size}
                  className="flex justify-between items-center bg-gray-50 px-2 py-1 rounded text-xs"
                >
                  <span className="font-medium">{size.size}</span>
                  <span className="text-green-600">{size.stock} ta</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-red-500">Skladda yo'q</div>
          )}
        </div>

        {/* Buyurtma tugmasi */}
        <button className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
          Buyurtma berish
        </button>
      </div>
    </div>
  );
};

export default VariantCard;
```

---

### Filter paneli komponenti:

```tsx
// src/components/catalog/CatalogFiltersPanel.tsx

import React from 'react';
import { CatalogFilters, CatalogQueryParams } from '@/types/catalog';

interface Props {
  filters: CatalogFilters;
  activeParams: CatalogQueryParams;
  onChange: (params: CatalogQueryParams) => void;
}

const CatalogFiltersPanel: React.FC<Props> = ({ filters, activeParams, onChange }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 sticky top-4">
      <h2 className="text-lg font-semibold mb-4">Filterlar</h2>

      {/* Brend */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Brend
        </label>
        <select
          value={activeParams.brand || ''}
          onChange={(e) => onChange({ brand: Number(e.target.value) || undefined })}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">Barchasi</option>
          {filters.brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
      </div>

      {/* Kolleksiya */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Kolleksiya
        </label>
        <select
          value={activeParams.collection || ''}
          onChange={(e) => onChange({ collection: e.target.value || undefined })}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">Barchasi</option>
          {filters.collections.map((coll) => (
            <option key={coll} value={coll}>
              {coll}
            </option>
          ))}
        </select>
      </div>

      {/* Rang */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rang
        </label>
        <select
          value={activeParams.color || ''}
          onChange={(e) => onChange({ color: e.target.value || undefined })}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">Barchasi</option>
          {filters.colors.map((color) => (
            <option key={color} value={color}>
              {color}
            </option>
          ))}
        </select>
      </div>

      {/* Eshik turi */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Eshik turi
        </label>
        <select
          value={activeParams.door_type || ''}
          onChange={(e) => onChange({ door_type: e.target.value || undefined })}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">Barchasi</option>
          {filters.door_types.map((type) => (
            <option key={type.value} value={type.value}>
              {type.display}
            </option>
          ))}
        </select>
      </div>

      {/* Hajm */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Hajm
        </label>
        <select
          value={activeParams.size || ''}
          onChange={(e) => onChange({ size: e.target.value || undefined })}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">Barchasi</option>
          {filters.sizes.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      {/* Filterlarni tozalash */}
      <button
        onClick={() => onChange({})}
        className="w-full bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 transition-colors text-sm"
      >
        Filterlarni tozalash
      </button>
    </div>
  );
};

export default CatalogFiltersPanel;
```

---

## 📊 Admin panel

### ProductModel (Model boshqaruvi):
- Brend, kolleksiya, model nomi
- Preview rasmi
- Variants count (ko'rsatkich)

### ProductVariant (Variant boshqaruvi):
- Model (ForeignKey)
- Rang, eshik turi
- Variant rasmi
- **Inline SKU editing** - variantga SKU lar qo'shish
- SKU selection filtered to "Дверное полотно" category

### ProductSKU (SKU boshqaruvi):
- Variant (ForeignKey)
- Hajm (400мм, 600мм, etc.)
- Product (OneToOne - existing ERP product)
- Readonly: price_usd, stock_quantity (from Product)

---

## ⚠️ Muhim eslatmalar

1. **Product jadval o'zgartirilmagan** - barcha orderlar, to'lovlar, tarixiy ma'lumotlar saqlanadi
2. **Faqat "Дверное полотно"** kategoriyasidagi mahsulotlar katalogga kiritilishi kerak
3. **Variant = Katalog kartasi** - har bir variant o'z SKU larini aggregation qiladi
4. **Minimal narx** - variantning narxi eng arzon SKU dan olinadi
5. **Hajm/sklad array** - har bir variant barcha o'lchamlari va sklad miqdorini ko'rsatadi

---

## 🔄 Migration yo'li

### Eski tizim:
```
Brand → Collection → DoorModel → DoorColor → ProductMeta → Product
```

### Yangi tizim:
```
Brand → ProductModel → ProductVariant → ProductSKU → Product
```

**O'chirish:** Collection, DoorModel, DoorColor, ProductMeta jadvallari
**Yaratish:** ProductModel, ProductVariant, ProductSKU jadvallari

---

## 🚀 Deployment

1. Backend migratsiyasini ishga tushirish:
```bash
cd backend
python manage.py migrate catalog
```

2. Admin panelda test ma'lumotlar yaratish:
- ProductModel: "ДУБРАВА СИБИРЬ" + "Эмалит" + "Бета Софт"
- ProductVariant: model + "тач-серый" + "ПГ" + rasm
- ProductSKU: 400мм, 600мм, 700мм, 800мм, 900мм (har biri Product ga bog'langan)

3. API test qilish:
```bash
curl http://127.0.0.1:8000/api/catalog/variants/
curl http://127.0.0.1:8000/api/catalog/variants/filters/
```

4. Frontend integratsiya qilish va test qilish

---

## 📞 Qo'shimcha savollarga javoblar

**Q: Eski ProductMeta ma'lumotlari qanday bo'ladi?**  
A: Migration ularni o'chiradi, lekin asl Product jadval saqlanadi. Agar kerak bo'lsa, eski ma'lumotlarni yangi tizimga qo'lda import qilish kerak.

**Q: Bir xil variant bir necha SKU da bo'lishi mumkinmi?**  
A: Ha, har bir hajm uchun alohida SKU. Masalan: variant "Бета Софт тач-серый ПГ" → 5 ta SKU (400mm, 600mm, 700mm, 800mm, 900mm).

**Q: Narx qayerdan olinadi?**  
A: SKU orqali Product dan. `ProductVariant.get_min_price_usd()` barcha SKU larning eng arzon narxini qaytaradi.

**Q: Frontend qaysi API endpoint ishlatishi kerak?**  
A: Faqat `/api/catalog/variants/` - bu barcha kerakli ma'lumotlarni qaytaradi.
