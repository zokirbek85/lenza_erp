# 🌍 Lenza ERP - To'liq I18N Integratsiya Qo'llanmasi

## 📋 Umumiy Ma'lumot

Ushbu qo'llanma Lenza ERP frontend qismida to'liq i18n (internationalization) integratsiyasini amalga oshirish uchun yaratilgan. Loyihada react-i18next va i18next kutubxonalari ishlatiladi.

## 🎯 Maqsadlar

- ✅ Barcha statik matnlarni tarjima qilish
- ✅ 3 til qo'llab-quvvatlash: O'zbek (uz), Rus (ru), Ingliz (en)
- ✅ Table headers, button labels, placeholders, tooltips, notifications
- ✅ Chart titles, PDF/Excel export nomlari
- ✅ Dynamic breadcrumbs va menu items
- ✅ Error messages va validation messages
- ✅ Status labels va dynamic content

## 🏗️ Loyiha Strukturasi

```
frontend/src/
├── i18n/
│   ├── index.ts                    # i18n configuration
│   └── locales/
│       ├── uz/translation.json     # O'zbek tili
│       ├── ru/translation.json     # Rus tili
│       └── en/translation.json     # Ingliz tili
├── pages/                          # Barcha sahifalar
├── components/                     # Barcha komponentlar
└── utils/
    └── formatters.ts               # Currency, date formatting
```

## 📝 Translation Keys Strukturasi

### Asosiy Modullar:

```json
{
  "app": {...},           // Global app settings
  "auth": {...},          // Login, 2FA
  "nav": {...},           // Navigation, menu items
  "actions": {...},       // Common actions (save, cancel, etc.)
  "common": {...},        // Common words (yes, no, loading, etc.)
  "dashboard": {...},     // Dashboard page
  "order": {...},         // Orders module
  "products": {...},      // Products module
  "dealers": {...},       // Dealers module
  "users": {...},         // Users module
  "regions": {...},       // Regions module
  "payments": {...},      // Payments module
  "expenses": {...},      // Expenses module
  "ledger": {...},        // Ledger module
  "returns": {...},       // Returns module
  "reconciliation": {...},// Reconciliation module
  "currency": {...},      // Currency rates
  "settings": {...},      // Settings page
  "kpi": {...},           // KPI pages
  "notifications": {...}, // Notifications
  "manuals": {...},       // User manuals
  "errors": {...},        // Error messages
  "success": {...},       // Success messages
  "pagination": {...}     // Pagination controls
}
```

## 🔧 Implementatsiya Patternlari

### 1. Sahifalarda useTranslation hook ishlatish

```tsx
import { useTranslation } from 'react-i18next';

const MyPage = () => {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('products.title')}</h1>
      <p>{t('products.subtitle')}</p>
    </div>
  );
};
```

### 2. Table Headers

```tsx
const columns = [
  {
    title: t('products.table.sku'),
    dataIndex: 'sku',
  },
  {
    title: t('products.table.name'),
    dataIndex: 'name',
  },
  {
    title: t('common.actions'),
    dataIndex: 'actions',
  },
];
```

### 3. Form Labels va Placeholders

```tsx
<input
  placeholder={t('products.form.namePlaceholder')}
  aria-label={t('products.name')}
/>
```

### 4. Buttons

```tsx
<button>{t('actions.save')}</button>
<button>{t('actions.cancel')}</button>
<button>{t('actions.delete')}</button>
```

### 5. Dynamic Content (interpolation)

```tsx
// Translation key: "order.confirm_change_message": "Siz buyurtma statusini '{{oldStatus}}' dan '{{newStatus}}' ga o'zgartirmoqchimisiz?"

t('order.confirm_change_message', { 
  oldStatus: 'created', 
  newStatus: 'confirmed' 
})
```

### 6. Notifications/Toasts

```tsx
toast.success(t('success.saved'));
toast.error(t('errors.network'));
message.success(t('products.productCreated'));
```

### 7. Status Labels

```tsx
const getStatusLabel = (status: string) => {
  return t(`order.status.${status}`);
};

// Usage:
<Badge>{getStatusLabel('confirmed')}</Badge>
```

### 8. PDF/Excel Export File Names

```tsx
const exportPdf = () => {
  const filename = `${t('products.title')}_${new Date().toISOString()}.pdf`;
  downloadFile(url, filename);
};
```

### 9. Chart Titles

```tsx
const chartOptions = {
  plugins: {
    title: {
      display: true,
      text: t('dashboard.salesTrend')
    },
    legend: {
      labels: {
        generateLabels: (chart) => [
          { text: t('ledger.income'), ... },
          { text: t('ledger.expense'), ... }
        ]
      }
    }
  }
};
```

### 10. Ant Design Component Messages

```tsx
<Popconfirm
  title={t('products.deleteConfirm')}
  okText={t('common.yes')}
  cancelText={t('common.no')}
  onConfirm={handleDelete}
>
  <Button>{t('actions.delete')}</Button>
</Popconfirm>
```

## 📦 Translation Fayllarini Qanday Tuzish

### Asosiy Qoidalar:

1. **Hierarxik struktura** - nested keys ishlatish
2. **Consistentlik** - bir xil pattern
3. **Reusability** - common so'zlarni alohida ajratish
4. **Descriptive keys** - key nomi o'qilishi oson bo'lishi kerak

### Misol - Products Module:

```json
{
  "products": {
    "title": "Mahsulotlar",
    "subtitle": "Mahsulotlar ro'yxati va inventar boshqaruvi",
    "newProduct": "Yangi mahsulot",
    "editProduct": "Mahsulotni tahrirlash",
    "noProducts": "Mahsulotlar mavjud emas",
    "productCreated": "Mahsulot yaratildi",
    "productUpdated": "Mahsulot yangilandi",
    "productDeleted": "Mahsulot o'chirildi",
    "deleteConfirm": "Ushbu mahsulotni o'chirishni tasdiqlaysizmi?",
    
    "table": {
      "sku": "SKU",
      "name": "Nomi",
      "brand": "Brend",
      "category": "Kategoriya",
      "price": "Narx",
      "stock": "Zaxira",
      "status": "Holat",
      "actions": "Amallar"
    },
    
    "form": {
      "skuPlaceholder": "SKU kiriting",
      "namePlaceholder": "Mahsulot nomini kiriting",
      "selectBrand": "Brendni tanlang",
      "selectCategory": "Kategoriyani tanlang",
      "pricePlaceholder": "Narxni kiriting"
    },
    
    "filters": {
      "brand": "Brend",
      "category": "Kategoriya",
      "availability": "Mavjudligi",
      "allBrands": "Barcha brendlar",
      "allCategories": "Barcha kategoriyalar"
    }
  }
}
```

## 🚀 Sahifalarni Yangilash Ketma-ketligi

### Priority 1 - Core Pages:
1. ✅ Orders.tsx (partially done)
2. ✅ Payments.tsx (partially done)
3. Products.tsx
4. Dealers.tsx
5. Users.tsx

### Priority 2 - Financial:
1. Expenses.tsx
2. Ledger.tsx
3. ExpenseReport.tsx
4. ExpenseTypes.tsx
5. Reconciliation.tsx

### Priority 3 - Other Pages:
1. Regions.tsx
2. CurrencyRates.tsx
3. ReturnsPage.tsx
4. SettingsPage.tsx
5. KPI Pages (OwnerKpiPage, ManagerKpiPage, WarehouseKpiPage)

### Priority 4 - Components:
1. PaginationControls.tsx
2. Modal.tsx
3. OrderFilters.tsx
4. Notification components
5. KPI components

## 🔄 Migration Pattern - Namuna

### Before (hardcoded):

```tsx
<h1 className="text-2xl font-semibold">Mahsulotlar</h1>
<p className="text-sm text-slate-500">Mahsulotlar ro'yxati</p>
<button>Yangi mahsulot</button>
<button>Saqlash</button>
<button>Bekor qilish</button>
```

### After (i18n):

```tsx
import { useTranslation } from 'react-i18next';

const ProductsPage = () => {
  const { t } = useTranslation();
  
  return (
    <>
      <h1 className="text-2xl font-semibold">{t('products.title')}</h1>
      <p className="text-sm text-slate-500">{t('products.subtitle')}</p>
      <button>{t('products.newProduct')}</button>
      <button>{t('actions.save')}</button>
      <button>{t('actions.cancel')}</button>
    </>
  );
};
```

## 🧪 Testing

### 1. Til o'zgartirish testi:
```
1. Sahifani oching
2. Til switcher orqali tilni o'zgartiring (uz → ru → en)
3. Barcha matnlar to'g'ri tarjima bo'lishini tekshiring
```

### 2. Missing keys testi:
```
Browser console-da quyidagi xatolarni tekshiring:
"i18next::translator: missingKey..." - bunday xato bo'lmasligi kerak
```

### 3. Interpolation testi:
```tsx
// Dynamic contentni tekshirish
t('order.confirm_change_message', { oldStatus: 'A', newStatus: 'B' })
// Natija: "Siz buyurtma statusini 'A' dan 'B' ga o'zgartirmoqchimisiz?"
```

### 4. Pluralization testi (agar kerak bo'lsa):
```json
{
  "items": "{{count}} ta element",
  "items_plural": "{{count}} ta elementlar"
}
```

```tsx
t('items', { count: 1 })  // "1 ta element"
t('items', { count: 5 })  // "5 ta elementlar"
```

## 📊 Progress Tracking

### Sahifalar (Pages):
- [ ] Products.tsx
- [ ] Dealers.tsx
- [ ] Users.tsx
- [ ] Regions.tsx
- [ ] Expenses.tsx
- [ ] ExpenseReport.tsx
- [ ] ExpenseTypes.tsx
- [ ] Ledger.tsx
- [ ] CurrencyRates.tsx
- [ ] ReturnsPage.tsx
- [ ] ReconciliationPage.tsx
- [ ] SettingsPage.tsx
- [ ] OwnerKpiPage.tsx
- [ ] ManagerKpiPage.tsx
- [ ] WarehouseKpiPage.tsx
- [ ] NotificationCenter.tsx

### Komponentlar (Components):
- [ ] PaginationControls.tsx
- [ ] Modal.tsx
- [ ] OrderFilters.tsx
- [ ] DebtByDealerChart.tsx
- [ ] DebtTrendChart.tsx
- [ ] LedgerBalanceWidget.tsx
- [ ] KpiCard.tsx
- [ ] OrderItemTable.tsx

## 🎨 Best Practices

### 1. Key naming:
```
✅ Good: products.table.name
❌ Bad: productsTableName
```

### 2. Common keys:
```json
{
  "common": {
    "yes": "Ha",
    "no": "Yo'q",
    "ok": "OK",
    "cancel": "Bekor qilish",
    "loading": "Yuklanmoqda...",
    "error": "Xatolik",
    "success": "Muvaffaqiyatli"
  }
}
```

### 3. Reuse actions:
```json
{
  "actions": {
    "create": "Yaratish",
    "save": "Saqlash",
    "edit": "Tahrirlash",
    "delete": "O'chirish",
    "cancel": "Bekor qilish",
    "export": "Eksport"
  }
}
```

### 4. Status translations:
```json
{
  "order": {
    "status": {
      "created": "Yaratildi",
      "confirmed": "Tasdiqlandi",
      "shipped": "Jo'natildi"
    }
  }
}
```

## 📁 Fayl Strukturasi

```
src/i18n/locales/
├── uz/
│   └── translation.json  (Asosiy til - O'zbek)
├── ru/
│   └── translation.json  (Rus tili)
└── en/
    └── translation.json  (Ingliz tili)
```

## 🔗 Foydali Resurslar

- [react-i18next documentation](https://react.i18next.com/)
- [i18next documentation](https://www.i18next.com/)
- [i18next interpolation](https://www.i18next.com/translation-function/interpolation)
- [i18next pluralization](https://www.i18next.com/translation-function/plurals)

## ✅ Commit Message Template

```
feat(i18n): add complete internationalization support

- Add comprehensive translation keys for all modules
- Migrate Products, Dealers, Users pages to i18n
- Migrate Expenses, Ledger, KPI pages to i18n
- Add translations for table headers, forms, buttons
- Add translations for PDF/Excel export file names
- Add translations for chart titles and labels
- Add translations for notifications and error messages
- Support 3 languages: Uzbek (uz), Russian (ru), English (en)

BREAKING CHANGE: All hardcoded texts replaced with translation keys
```

## 🧑‍💻 Development Workflow

1. **Translation keylarini qo'shish:**
   - uz/translation.json ga key qo'shing
   - ru/translation.json ga tarjima qo'shing
   - en/translation.json ga tarjima qo'shing

2. **Komponentda ishlatish:**
   - `useTranslation()` hookini import qiling
   - `t('key.path')` orqali matnni oling

3. **Test qilish:**
   - Til o'zgartirib ko'ring
   - Browser consoleda xatolar borligini tekshiring

4. **Commit:**
   - O'zgarishlarni commit qiling
   - Izohli commit message yozing

## 🎯 Final Checklist

- [ ] Barcha pages i18n bilan
- [ ] Barcha components i18n bilan
- [ ] Barcha table headers tarjimalanganmi
- [ ] Barcha form labels va placeholders tarjimalanganmi
- [ ] Barcha buttons tarjimalanganmi
- [ ] Barcha notifications tarjimalanganmi
- [ ] Barcha error messages tarjimalanganmi
- [ ] PDF/Excel file names tarjimalanganmi
- [ ] Chart titles tarjimalanganmi
- [ ] Breadcrumbs tarjimalanganmi
- [ ] Menu items tarjimalanganmi (✅ Already done in Sidebar)
- [ ] 3 til to'liq qo'llab-quvvatlanmoqdami
- [ ] Missing keys yo'qmi
- [ ] Barcha tillar testdanmi

---

**Author:** AI Assistant  
**Date:** 2025-01-XX  
**Version:** 1.0.0  
**Project:** Lenza ERP
