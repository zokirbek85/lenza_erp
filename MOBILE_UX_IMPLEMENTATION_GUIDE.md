# Mobile UX Implementation Guide - Lenza ERP

## Overview

Это руководство описывает полную мобильную адаптацию модулей **Orders**, **Payments**, **Products** и **Catalog** для устройств с шириной экрана **320-480px** без нарушения десктопной функциональности.

---

## Технический стек

- **Frontend**: React 18, TypeScript, Vite
- **UI Library**: Ant Design 5
- **Routing**: React Router v6
- **State**: Custom hooks + Context
- **Styling**: Tailwind CSS + Custom CSS
- **Mobile Breakpoint**: `@media (max-width: 768px)`

---

## Архитектурные принципы

### 1. Mobile-First Components

Все новые мобильные компоненты созданы в `frontend/src/pages/_mobile/` и `frontend/src/components/responsive/`:

```
frontend/src/
├── pages/
│   └── _mobile/
│       ├── MobileOrderForm.tsx        (NEW)
│       ├── MobilePaymentForm.tsx      (NEW)
│       ├── MobileProductForm.tsx      (NEW)
│       ├── MobileCatalogCards.tsx     (NEW)
│       ├── OrdersMobileCards.tsx      (EXISTS)
│       ├── PaymentsMobileCards.tsx    (EXISTS)
│       └── ProductsMobileCards.tsx    (EXISTS)
├── components/
    └── responsive/
        ├── MobileDrawerForm.tsx       (NEW - Universal form drawer)
        ├── MobileBottomBar.tsx        (NEW - Fixed action bar)
        ├── MobileFormField.tsx        (NEW - Touch-optimized fields)
        ├── cards/
        │   ├── MobileCard.tsx         (EXISTS)
        │   └── MobileCardList.tsx     (EXISTS)
        └── filters/
            ├── FilterDrawer.tsx        (EXISTS)
            └── FilterTrigger.tsx       (EXISTS)
```

### 2. Responsive Strategy

```tsx
import { useIsMobile } from '../hooks/useIsMobile';

const MyPage = () => {
  const { isMobile } = useIsMobile(); // <= 768px

  if (isMobile) {
    return <MobileView />;
  }

  return <DesktopView />;
};
```

### 3. Z-Index Hierarchy

```css
/* Global CSS (index.css) */
.layout-header          { z-index: 1000; }
.ant-drawer             { z-index: 2500 !important; }
.ant-modal-root         { z-index: 2800 !important; }
.mobile-drawer-form     { z-index: 3000 !important; }
```

---

## Новые компоненты

### 1. MobileDrawerForm

**Универсальный полноэкранный Drawer для форм**

```tsx
import MobileDrawerForm from '../components/responsive/MobileDrawerForm';

<MobileDrawerForm
  open={isOpen}
  onClose={() => setOpen(false)}
  title="Create Order"
  footer={
    <div className="flex gap-2">
      <button onClick={onCancel}>Cancel</button>
      <button onClick={onSave}>Save</button>
    </div>
  }
>
  {/* Form content */}
</MobileDrawerForm>
```

**Особенности**:
- Полноэкранный (100vh)
- Фиксированный header с кнопкой закрытия
- Опциональный фиксированный footer
- Скроллируемый контент
- z-index: 3000

---

### 2. MobileBottomBar

**Фиксированная панель действий внизу экрана**

```tsx
import MobileBottomBar from '../components/responsive/MobileBottomBar';

<MobileBottomBar>
  <button className="flex-1">Cancel</button>
  <button className="flex-1">Save</button>
</MobileBottomBar>
```

**Особенности**:
- Фиксируется внизу (z-index: 2900)
- Учитывает safe area insets (iPhone notches)
- Полупрозрачный фон с blur
- Тень для визуального разделения

---

### 3. MobileFormField

**Touch-оптимизированное поле формы**

```tsx
import MobileFormField from '../components/responsive/MobileFormField';

<MobileFormField
  label="Dealer"
  required
  error={errors.dealer}
  hint="Select the dealer for this payment"
>
  <select>...</select>
</MobileFormField>
```

**Особенности**:
- Крупные лейблы (font-weight: 600)
- Красная звездочка для required полей
- Подсказки (hint text)
- Сообщения об ошибках (error messages)

---

## Интеграция в существующие страницы

### Orders Page

**Файл**: `frontend/src/pages/Orders.tsx`

**Изменения**:

1. Импортировать новый компонент:
```tsx
import MobileOrderForm from './_mobile/MobileOrderForm';
```

2. Заменить текущую мобильную форму (если существует) на:
```tsx
{!isWarehouse && isMobile && (
  <MobileOrderForm
    open={showCreateForm}
    onClose={() => setShowCreateForm(false)}
    dealerId={dealerId}
    orderType={orderType}
    note={note}
    dealers={dealers}
    brands={brands}
    categories={categories}
    products={availableProducts}
    selectedItems={selectedItems}
    brandId={brandId}
    categoryId={categoryId}
    productSearch={productSearch}
    selectedProduct={selectedProduct}
    quantityInput={quantityInput}
    priceInput={priceInput}
    productsLoading={productsLoading}
    onDealerChange={setDealerId}
    onOrderTypeChange={setOrderType}
    onNoteChange={setNote}
    onBrandChange={(value) => setFilters({ brandId: value || undefined })}
    onCategoryChange={(value) => setFilters({ categoryId: value || undefined })}
    onProductSearchChange={setProductSearch}
    onProductSelect={handleSelectProduct}
    onQuantityChange={setQuantityInput}
    onPriceChange={setPriceInput}
    onAddProduct={handleAddSelectedProduct}
    onRemoveItem={removeItem}
    onItemQtyChange={handleItemQtyChange}
    onItemPriceChange={handleItemPriceChange}
    onSubmit={handleSubmit}
    onClearDraft={handleClearDraft}
  />
)}
```

**Результат**:
- ✅ Полноэкранная форма заказа на мобильных
- ✅ Удобный выбор товаров с фильтрами
- ✅ Список товаров с inline-редактированием
- ✅ Фиксированная панель с итогом и кнопками

---

### Payments Page

**Файл**: `frontend/src/pages/Payments.tsx`

**Изменения**:

1. Импортировать:
```tsx
import MobilePaymentForm from './_mobile/MobilePaymentForm';
```

2. Добавить в рендер:
```tsx
{isMobile && (
  <MobilePaymentForm
    open={showForm}
    onClose={() => setShowForm(false)}
    form={form}
    dealers={dealers}
    rates={rates}
    cards={cards}
    onFormChange={(field, value) => setForm({ ...form, [field]: value })}
    onSubmit={handleSubmit}
    submitting={submitting}
  />
)}
```

**Результат**:
- ✅ Полноэкранная форма платежа
- ✅ Upload чека с preview
- ✅ Крупные touch-friendly поля
- ✅ Фиксированная панель действий

---

### Products Page

**Файл**: `frontend/src/pages/Products.tsx`

**Изменения**:

1. Импортировать:
```tsx
import MobileProductForm from './_mobile/MobileProductForm';
```

2. Добавить в рендер:
```tsx
{isMobile && (
  <MobileProductForm
    open={showForm}
    onClose={() => {
      setShowForm(false);
      setEditingId(null);
      setFormState(emptyForm);
    }}
    form={formState}
    brands={brands}
    categories={categories}
    editingId={editingId}
    imagePreview={imagePreview}
    imageFile={imageFile}
    imageUploading={imageUploading}
    onFormChange={(field, value) => setFormState({ ...formState, [field]: value })}
    onImageChange={setImageFile}
    onImageRemove={() => {
      setImageFile(null);
      setImagePreview(null);
    }}
    onSubmit={handleSubmit}
    submitting={submitting}
  />
)}
```

**Результат**:
- ✅ Полноэкранная форма товара
- ✅ Upload изображения с preview
- ✅ Группировка полей по секциям
- ✅ Валидация с сообщениями об ошибках

---

### Catalog Page

**Файл**: `frontend/src/pages/Catalog.tsx`

**Изменения**:

1. Импортировать:
```tsx
import MobileCatalogCards from './_mobile/MobileCatalogCards';
import { useIsMobile } from '../hooks/useIsMobile';
```

2. В рендере списка товаров:
```tsx
const { isMobile } = useIsMobile();

// Desktop View
if (!isMobile) {
  return (
    <div>
      {/* Existing desktop catalog cards/gallery */}
    </div>
  );
}

// Mobile View
return (
  <MobileCatalogCards
    products={filteredGroupedProducts}
    viewMode={viewMode}
    onProductClick={(product) => {
      // Open product detail modal
      message.info(`Selected: ${product.baseName}`);
    }}
  />
);
```

**Результат**:
- ✅ 4 режима отображения (cards, gallery-comfort, gallery-compact, gallery-ultra)
- ✅ Адаптивная сетка (1-3 колонки)
- ✅ Breakdown остатков по ширинам
- ✅ Badges для статуса наличия

---

## Global CSS Updates

**Файл**: `frontend/src/index.css`

**Добавлено**:

```css
/* Mobile Responsive Styles */
@media (max-width: 768px) {
  /* Touch-optimized form inputs */
  .mobile-form-field-input input,
  .mobile-form-field-input select,
  .mobile-form-field-input textarea {
    min-height: 44px !important;
    font-size: 16px !important; /* Prevents iOS zoom */
    padding: 12px !important;
    border-radius: 8px !important;
  }

  /* Mobile buttons - larger touch targets */
  .mobile-btn {
    min-height: 44px !important;
    padding: 12px 16px !important;
    font-size: 15px !important;
    font-weight: 600 !important;
    border-radius: 8px !important;
    touch-action: manipulation;
  }

  /* Prevent horizontal scroll */
  body {
    overflow-x: hidden !important;
  }

  /* Page wrapper full width on mobile */
  .page-wrapper {
    max-width: 100% !important;
    padding: 0 !important;
  }
}

/* Z-index hierarchy */
.layout-header { z-index: 1000; }
.ant-drawer { z-index: 2500 !important; }
.ant-modal-root { z-index: 2800 !important; }
.mobile-drawer-form .ant-drawer-content-wrapper { z-index: 3000 !important; }

/* Touch-friendly action buttons */
.mobile-action-btn {
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-center;
  touch-action: manipulation;
  user-select: none;
}
```

---

## Touch Optimization Best Practices

### 1. Минимальный размер кнопок

```css
button, a {
  min-height: 44px;
  min-width: 44px;
}
```

### 2. Предотвращение iOS zoom

```css
input, select, textarea {
  font-size: 16px !important; /* Prevents zoom on focus */
}
```

### 3. Safe Area Insets

```css
.mobile-bottom-bar {
  padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
}
```

### 4. Touch Action

```css
button {
  touch-action: manipulation; /* Removes 300ms tap delay */
}
```

---

## Типичные проблемы и решения

### Проблема: Форма скрывается под клавиатурой

**Решение**:
```tsx
// Используйте MobileDrawerForm - он автоматически обрабатывает скролл
<MobileDrawerForm>
  <form>
    {/* Fields */}
    <div style={{ height: '80px' }} /> {/* Bottom padding */}
  </form>
</MobileDrawerForm>
```

### Проблема: Горизонтальный скролл

**Решение**:
```css
body {
  overflow-x: hidden !important;
}

.page-wrapper {
  max-width: 100%;
}
```

### Проблема: Элементы перекрываются

**Решение**: Проверьте z-index иерархию:
- Header: 1000
- Drawer: 2500
- Modal: 2800
- Mobile Form: 3000

### Проблема: Двойной тап для зума

**Решение**:
```css
input {
  font-size: 16px !important;
}
```

---

## Performance Optimization

### 1. Lazy Loading форм

```tsx
import { lazy, Suspense } from 'react';

const MobileOrderForm = lazy(() => import('./_mobile/MobileOrderForm'));

// In render:
<Suspense fallback={<Spin />}>
  {showForm && <MobileOrderForm />}
</Suspense>
```

### 2. Debounce поиска

```tsx
import { useMemo } from 'react';
import debounce from 'lodash/debounce';

const debouncedSearch = useMemo(
  () => debounce((value) => fetchProducts(value), 300),
  []
);
```

### 3. Virtualization списков

```tsx
// For long lists (>100 items)
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={100}
>
  {({ index, style }) => (
    <div style={style}>{items[index]}</div>
  )}
</FixedSizeList>
```

---

## Testing

Используйте чек-лист из `MOBILE_UX_TESTING_CHECKLIST.md`:

```bash
# Chrome DevTools
Cmd+Shift+M (Mac) / Ctrl+Shift+M (Windows)

# Test devices:
- iPhone SE (375 × 667)
- iPhone 13 (390 × 844)
- Pixel 5 (393 × 851)
- iPad Mini (768 × 1024)
```

---

## Deployment

### 1. Build

```bash
cd frontend
npm run build
```

### 2. Test Production Build

```bash
npm run preview
```

### 3. Deploy to Server

```bash
git add .
git commit -m "feat: Mobile UX improvements for Orders, Payments, Products, Catalog"
git push origin main

# On server:
cd /opt/lenza_erp
git pull origin main
./update.sh
```

### 4. Verify on Production

- Desktop: https://erp.lenza.uz
- Mobile: Open from phone or use Chrome DevTools

---

## Rollback Plan

Если что-то пошло не так:

```bash
# On server:
cd /opt/lenza_erp
git log --oneline -5  # Find previous commit
git reset --hard <commit-hash>
./update.sh
```

Или:
```bash
# Restart old blue/green stack
docker compose -f deploy/docker-compose.green.yml up -d
# Update Nginx to point to old stack
```

---

## Next Steps

### Phase 2 (Optional Enhancements)

1. **Pull-to-Refresh**
   ```tsx
   import { PullToRefresh } from 'antd-mobile';
   ```

2. **Swipe Actions**
   ```tsx
   // Swipe left to delete item
   <SwipeAction onDelete={handleDelete}>
     <ItemCard />
   </SwipeAction>
   ```

3. **Offline Support**
   ```tsx
   // Service Worker + IndexedDB
   import { useOfflineState } from '../hooks/useOfflineState';
   ```

4. **Progressive Web App (PWA)**
   ```json
   // manifest.json
   {
     "name": "Lenza ERP",
     "short_name": "Lenza",
     "start_url": "/",
     "display": "standalone"
   }
   ```

---

## Support & Maintenance

### Known Issues

1. **iOS Safari 15.x**: Fixed position elements may glitch during scroll
   - **Workaround**: Use `position: sticky` where possible

2. **Android Chrome**: Select dropdowns may not respect custom styling
   - **Workaround**: Use native dropdowns on mobile

### Browser Support

- **iOS Safari**: 14.0+
- **Android Chrome**: 90+
- **Desktop Chrome**: 100+
- **Desktop Firefox**: 100+
- **Desktop Safari**: 14.0+

---

## Contributors

- **Mobile UX Design**: Claude AI
- **Implementation**: Development Team
- **Testing**: QA Team

---

## Changelog

### Version 1.0.0 (November 2025)
- ✅ Mobile-optimized Orders module
- ✅ Mobile-optimized Payments module
- ✅ Mobile-optimized Products module
- ✅ Mobile-optimized Catalog module
- ✅ Universal mobile components (Drawer, BottomBar, FormField)
- ✅ Touch-optimized inputs (min 44px)
- ✅ Z-index hierarchy (1000-3000)
- ✅ Dark mode support
- ✅ Safe area insets (iPhone notches)
- ✅ Comprehensive testing checklist

---

## License

Internal use only - Lenza ERP
