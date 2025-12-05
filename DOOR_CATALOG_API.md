# Door Catalog API Documentation

## Обзор

Система каталогов для категории "Дверное полотно" предоставляет структурированный доступ к продуктам через иерархию:

**Brand → Collection → Model → (Color + Type) → Size (SKU)**

## Backend Models

### ProductMeta
Дополнительная мета-информация для продуктов категории "Дверное полотно". Связана с `Product` через OneToOne relationship.

**Поля:**
- `product` - OneToOne связь с Product
- `collection` - FK на Collection (коллекция)
- `model` - FK на DoorModel (модель двери)
- `color` - FK на DoorColor (цвет/ранг)
- `door_type` - TextChoices: ПГ, ПО, ПДО, ПДГ
- `door_size` - TextChoices: 400мм, 600мм, 700мм, 800мм, 900мм, 20-6, 20-7, 20-8, и т.д.
- `custom_size` - CharField (если размер не из списка)
- `notes` - TextField (дополнительные заметки)

### Collection
Коллекция дверей (например, "Классика", "Модерн")

### DoorModel
Модель двери (например, "М1", "Венеция"), связана с Collection

### DoorColor
Цвет/ранг двери с кодом артикула

---

## API Endpoints

### 1. Collections (Коллекции)

#### GET `/api/catalog/collections/`
Получить список всех активных коллекций

**Response:**
```json
[
  {
    "id": 1,
    "name": "Классика",
    "description": "Классические двери",
    "is_active": true
  }
]
```

---

### 2. Door Models (Модели дверей)

#### GET `/api/catalog/door-models/`
Получить список моделей дверей

**Query Parameters:**
- `collection` - Фильтр по ID коллекции

**Response:**
```json
[
  {
    "id": 1,
    "name": "Венеция",
    "collection": 1,
    "collection_name": "Классика",
    "description": "",
    "is_active": true
  }
]
```

---

### 3. Door Colors (Цвета)

#### GET `/api/catalog/door-colors/`
Получить список цветов/рангов

**Response:**
```json
[
  {
    "id": 1,
    "name": "Орех",
    "code": "OR-01",
    "is_active": true
  }
]
```

---

### 4. Product Metadata

#### GET `/api/catalog/product-meta/`
Получить мета-информацию продуктов

**Query Parameters:**
- `collection` - Фильтр по ID коллекции
- `model` - Фильтр по ID модели
- `color` - Фильтр по ID цвета
- `door_type` - Фильтр по типу двери (ПГ, ПО, ПДО, ПДГ)
- `door_size` - Фильтр по размеру
- `search` - Поиск по SKU или названию

**Response:**
```json
[
  {
    "product": 123,
    "collection": 1,
    "collection_name": "Классика",
    "model": 5,
    "model_name": "Венеция",
    "color": 3,
    "color_name": "Орех",
    "door_type": "ПГ",
    "door_type_display": "ПГ (Полотно глухое)",
    "door_size": "800мм",
    "door_size_display": "800мм",
    "custom_size": "",
    "notes": "",
    "created_at": "2025-12-06T10:00:00Z",
    "updated_at": "2025-12-06T10:00:00Z"
  }
]
```

---

### 5. Door Catalog (Иерархическая структура)

#### GET `/api/catalog/doors/`
Получить полную иерархическую структуру каталога

**Query Parameters:**
- `brand` - Фильтр по ID бренда
- `collection` - Фильтр по ID коллекции
- `model` - Фильтр по ID модели
- `color` - Фильтр по ID цвета
- `door_type` - Фильтр по типу двери
- `door_size` - Фильтр по размеру
- `search` - Поиск по SKU или названию

**Response Structure:**
```json
[
  {
    "brand_id": 1,
    "brand_name": "Torex",
    "collections": [
      {
        "collection_id": 1,
        "collection_name": "Классика",
        "models": [
          {
            "model_id": 5,
            "model_name": "Венеция",
            "color_groups": [
              {
                "color_id": 3,
                "color_name": "Орех",
                "color_code": "OR-01",
                "products": [
                  {
                    "product_id": 123,
                    "sku": "TRX-CL-VN-OR-PG-800",
                    "name": "Дверь Классика Венеция Орех ПГ 800",
                    "door_type": "ПГ",
                    "door_type_display": "ПГ (Полотно глухое)",
                    "door_size": "800мм",
                    "door_size_display": "800мм",
                    "custom_size": "",
                    "cost_usd": 150.00,
                    "sell_price_usd": 200.00,
                    "stock_ok": 25.00,
                    "stock_defect": 2.00,
                    "is_active": true,
                    "image": "http://example.com/media/products/door.jpg"
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
]
```

#### GET `/api/catalog/doors/filters/`
Получить все доступные опции фильтров

**Response:**
```json
{
  "brands": [
    {"id": 1, "name": "Torex"}
  ],
  "collections": [
    {"id": 1, "name": "Классика"}
  ],
  "models": [
    {"id": 5, "name": "Венеция"}
  ],
  "colors": [
    {"id": 3, "name": "Орех"}
  ],
  "door_types": [
    {"value": "ПГ", "label": "ПГ (Полотно глухое)"},
    {"value": "ПО", "label": "ПО (Полотно остеклённое)"}
  ],
  "door_sizes": [
    {"value": "800мм", "label": "800мм"},
    {"value": "900мм", "label": "900мм"}
  ]
}
```

---

## Frontend Implementation Examples

### 1. Fetch Complete Catalog

```typescript
// frontend/src/api/doorCatalogApi.ts
import { http } from '../app/http';

export interface DoorProduct {
  product_id: number;
  sku: string;
  name: string;
  door_type: string;
  door_type_display: string;
  door_size: string;
  door_size_display: string;
  custom_size: string;
  cost_usd: number;
  sell_price_usd: number;
  stock_ok: number;
  stock_defect: number;
  is_active: boolean;
  image: string | null;
}

export interface ColorGroup {
  color_id: number;
  color_name: string;
  color_code: string;
  products: DoorProduct[];
}

export interface DoorModel {
  model_id: number;
  model_name: string;
  color_groups: ColorGroup[];
}

export interface Collection {
  collection_id: number;
  collection_name: string;
  models: DoorModel[];
}

export interface BrandCatalog {
  brand_id: number;
  brand_name: string;
  collections: Collection[];
}

export interface CatalogFilters {
  brand?: number;
  collection?: number;
  model?: number;
  color?: number;
  door_type?: string;
  door_size?: string;
  search?: string;
}

export const fetchDoorCatalog = async (filters?: CatalogFilters): Promise<BrandCatalog[]> => {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value.toString());
    });
  }
  
  const response = await http.get(`/catalog/doors/?${params.toString()}`);
  return response.data;
};

export const fetchCatalogFilters = async () => {
  const response = await http.get('/catalog/doors/filters/');
  return response.data;
};

export const fetchCollections = async () => {
  const response = await http.get('/catalog/collections/');
  return response.data;
};

export const fetchDoorModels = async (collectionId?: number) => {
  const params = collectionId ? `?collection=${collectionId}` : '';
  const response = await http.get(`/catalog/door-models/${params}`);
  return response.data;
};

export const fetchDoorColors = async () => {
  const response = await http.get('/catalog/door-colors/');
  return response.data;
};
```

### 2. Catalog Display Component

```tsx
// frontend/src/pages/DoorCatalogPage.tsx
import React, { useEffect, useState } from 'react';
import { Select, Spin, Card, Row, Col, Image, Tag } from 'antd';
import { fetchDoorCatalog, fetchCatalogFilters, BrandCatalog } from '../api/doorCatalogApi';

const DoorCatalogPage: React.FC = () => {
  const [catalog, setCatalog] = useState<BrandCatalog[]>([]);
  const [filters, setFilters] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    brand: undefined,
    collection: undefined,
    model: undefined,
    color: undefined,
    door_type: undefined,
    door_size: undefined,
  });

  useEffect(() => {
    loadFilters();
    loadCatalog();
  }, []);

  const loadFilters = async () => {
    try {
      const data = await fetchCatalogFilters();
      setFilters(data);
    } catch (error) {
      console.error('Failed to load filters', error);
    }
  };

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const data = await fetchDoorCatalog(selectedFilters);
      setCatalog(data);
    } catch (error) {
      console.error('Failed to load catalog', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setSelectedFilters(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    loadCatalog();
  }, [selectedFilters]);

  if (loading) return <Spin size="large" />;

  return (
    <div>
      <h1>Каталог дверей</h1>
      
      {/* Filters */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Select
            placeholder="Бренд"
            allowClear
            style={{ width: '100%' }}
            onChange={(value) => handleFilterChange('brand', value)}
            options={filters?.brands.map((b: any) => ({ label: b.name, value: b.id }))}
          />
        </Col>
        <Col span={6}>
          <Select
            placeholder="Коллекция"
            allowClear
            style={{ width: '100%' }}
            onChange={(value) => handleFilterChange('collection', value)}
            options={filters?.collections.map((c: any) => ({ label: c.name, value: c.id }))}
          />
        </Col>
        <Col span={6}>
          <Select
            placeholder="Тип двери"
            allowClear
            style={{ width: '100%' }}
            onChange={(value) => handleFilterChange('door_type', value)}
            options={filters?.door_types.map((t: any) => ({ label: t.label, value: t.value }))}
          />
        </Col>
        <Col span={6}>
          <Select
            placeholder="Размер"
            allowClear
            style={{ width: '100%' }}
            onChange={(value) => handleFilterChange('door_size', value)}
            options={filters?.door_sizes.map((s: any) => ({ label: s.label, value: s.value }))}
          />
        </Col>
      </Row>

      {/* Catalog Tree */}
      {catalog.map(brand => (
        <div key={brand.brand_id} style={{ marginBottom: 32 }}>
          <h2>{brand.brand_name}</h2>
          
          {brand.collections.map(collection => (
            <div key={collection.collection_id} style={{ marginBottom: 24 }}>
              <h3>{collection.collection_name}</h3>
              
              {collection.models.map(model => (
                <div key={model.model_id} style={{ marginBottom: 16 }}>
                  <h4>{model.model_name}</h4>
                  
                  {model.color_groups.map(colorGroup => (
                    <div key={colorGroup.color_id} style={{ marginBottom: 12 }}>
                      <Tag color="blue">{colorGroup.color_name}</Tag>
                      
                      <Row gutter={[16, 16]}>
                        {colorGroup.products.map(product => (
                          <Col key={product.product_id} span={6}>
                            <Card
                              hoverable
                              cover={<Image src={product.image || '/placeholder.jpg'} alt={product.name} />}
                            >
                              <Card.Meta
                                title={product.sku}
                                description={
                                  <>
                                    <div>{product.door_type_display}</div>
                                    <div>{product.door_size_display}</div>
                                    <div>Цена: ${product.sell_price_usd}</div>
                                    <div>Остаток: {product.stock_ok}</div>
                                  </>
                                }
                              />
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default DoorCatalogPage;
```

### 3. Product Metadata Management

```tsx
// frontend/src/pages/ProductMetaManagement.tsx
import React, { useState } from 'react';
import { Form, Select, Button, message } from 'antd';
import { http } from '../app/http';

interface ProductMetaFormProps {
  productId: number;
  initialData?: any;
}

const ProductMetaForm: React.FC<ProductMetaFormProps> = ({ productId, initialData }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      if (initialData) {
        await http.put(`/catalog/product-meta/${productId}/`, values);
        message.success('Metadata updated');
      } else {
        await http.post('/catalog/product-meta/', { ...values, product: productId });
        message.success('Metadata created');
      }
    } catch (error) {
      message.error('Failed to save metadata');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form form={form} onFinish={onFinish} initialValues={initialData}>
      <Form.Item name="collection" label="Collection">
        <Select />
      </Form.Item>
      <Form.Item name="model" label="Model">
        <Select />
      </Form.Item>
      <Form.Item name="color" label="Color">
        <Select />
      </Form.Item>
      <Form.Item name="door_type" label="Door Type">
        <Select>
          <Select.Option value="ПГ">ПГ</Select.Option>
          <Select.Option value="ПО">ПО</Select.Option>
          <Select.Option value="ПДО">ПДО</Select.Option>
          <Select.Option value="ПДГ">ПДГ</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item name="door_size" label="Door Size">
        <Select>
          <Select.Option value="800мм">800мм</Select.Option>
          <Select.Option value="900мм">900мм</Select.Option>
        </Select>
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={loading}>
        Save
      </Button>
    </Form>
  );
};
```

---

## Admin Panel Usage

1. **Добавить коллекцию**: `/admin/catalog/collection/add/`
2. **Добавить модель**: `/admin/catalog/doormodel/add/`
3. **Добавить цвет**: `/admin/catalog/doorcolor/add/`
4. **Управлять мета-данными продукта**: `/admin/catalog/productmeta/`
   - Или через inline в `/admin/catalog/product/`

---

## Important Notes

1. **Product.name не изменяется** - вся существующая функциональность (заказы, экспорты, финансы) продолжает работать
2. **Только для "Дверное полотно"** - мета-данные применяются только к продуктам этой категории
3. **Ручное заполнение** - админ вручную создает Collection, Model, Color и привязывает к продуктам
4. **Расширяемость** - структура готова для добавления hardware (ручки, коробка, добор, наличник)

---

## Migration Steps

1. Run migrations: `python manage.py migrate`
2. Create collections in admin
3. Create door models linked to collections
4. Create door colors
5. Link existing "Дверное полотно" products to metadata via admin panel
6. Test API endpoints
7. Integrate frontend components

---

## Future Enhancements

- Bulk import tool for ProductMeta
- Auto-generation of SKU based on metadata
- Hardware accessories catalog (ручки, коробка, добор, наличник)
- Price calculator based on configuration
- Product recommendations based on metadata
