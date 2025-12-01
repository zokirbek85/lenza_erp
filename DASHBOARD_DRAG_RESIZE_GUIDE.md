# Dashboard Drag & Resize Qo'llanma

## 🎯 Umumiy ma'lumot

Lenza ERP dashboard endi **to'liq interaktiv** — har bir widgetni **sudralab ko'chirish** (drag) va **o'lchamini o'zgartirish** (resize) mumkin.

---

## 🚀 Qanday ishlatiladi?

### 1️⃣ **Widgetni sudralab ko'chirish (Drag)**

- Widget ustiga sichqoncha bilan bosing
- Sudrab, kerakli joyga olib boring
- Qo'yib yuboring — layout avtomatik saqlanadi

### 2️⃣ **Widget o'lchamini o'zgartirish (Resize)**

- Widget o'ng-pastki burchagida **resize handle** (tutqich) ko'rinadi
- Tutqichni sudrab, widgetni kattalashtiring yoki kichiklashtiring
- 3 ta resize yo'nalishi mavjud:
  - **SE (south-east)** — diagonalga o'zgartirish
  - **E (east)** — gorizontal kengaytirish
  - **S (south)** — vertikal cho'zish

### 3️⃣ **Responsive moslashuv**

Dashboard 4 ta breakpoint bo'yicha avtomatik moslashadi:

| Breakpoint | Ekran kengligi | Grid ustunlar |
|------------|----------------|---------------|
| **lg**     | ≥ 1400px       | 12            |
| **md**     | ≥ 996px        | 10            |
| **sm**     | ≥ 768px        | 6             |
| **xs**     | < 768px        | 2             |

---

## 🛠 Texnik parametrlar

### React-Grid-Layout konfiguratsiyasi

```tsx
<ResponsiveGridLayout
  breakpoints={{ lg: 1400, md: 996, sm: 768, xs: 480 }}
  cols={{ lg: 12, md: 10, sm: 6, xs: 2 }}
  rowHeight={45}                    // Har bir qator balandligi 45px
  margin={[15, 15]}                 // Widget orasidagi bo'sh joy
  containerPadding={[10, 10]}       // Container padding
  isDraggable={true}                // Drag yoqilgan
  isResizable={true}                // Resize yoqilgan
  resizeHandles={['se', 'e', 's']}  // 3 yo'nalishda resize
  compactType={null}                // Avtomatik siqish o'chirilgan
  preventCollision={false}          // Widgetlar ustma-ust qo'yilishi mumkin
/>
```

### CSS optimizatsiyalari

Barcha widget ichidagi **Chart**, **Table**, va **Card** komponentlari avtomatik moslashadi:

```css
/* Widget container - flexbox layout */
.react-grid-item {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Widget content - to'liq balandlik */
.react-grid-item > div {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Chart va table containerlar */
.chart-container,
.table-container {
  height: 100% !important;
}

/* Ant Design Card komponentlari */
.react-grid-item .ant-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.react-grid-item .ant-card-body {
  flex: 1;
  overflow: auto;
  min-height: 0;
}
```

---

## 💾 Layout saqlash mexanizmi

### 1. **LocalStorage (tezkor saqlash)**

Har bir o'zgarish **darhol** localStorage'ga saqlanadi:

```typescript
localStorage.setItem('dashboardLayout_lg', JSON.stringify(layout));
localStorage.setItem('dashboardLayout_md', JSON.stringify(layout));
localStorage.setItem('dashboardLayout_sm', JSON.stringify(layout));
localStorage.setItem('dashboardLayout_xs', JSON.stringify(layout));
```

### 2. **Backend API (server saqlash)**

500ms debounce bilan backend'ga yuboriladi:

```typescript
// POST /api/dashboard/layout/
{
  "layout": [
    { "i": "kpi_sales", "x": 0, "y": 0, "w": 3, "h": 3 },
    { "i": "top_products", "x": 0, "y": 7, "w": 6, "h": 10 },
    // ...
  ]
}
```

### 3. **Layout yuklash tartibi (priority)**

```
1. Backend API (/api/dashboard/layout/)
   ↓ (agar xato bo'lsa)
2. LocalStorage (dashboardLayout_lg)
   ↓ (agar bo'sh bo'lsa)
3. DEFAULT_LAYOUT (default konfiguratsiya)
```

---

## 📊 Mavjud widgetlar ro'yxati

Dashboard'da 15 ta interaktiv widget mavjud:

| Widget ID               | Tavsif                          | Default o'lcham |
|-------------------------|--------------------------------|-----------------|
| `kpi_sales`             | Jami savdolar                  | 3x3             |
| `kpi_payments`          | Jami to'lovlar                 | 3x3             |
| `kpi_debt`              | Umumiy qarzdorlik              | 3x3             |
| `kpi_dealers`           | Dilerlar soni                  | 3x3             |
| `inventory_stats`       | Ombor statistikasi             | 4x4             |
| `top_products`          | Top mahsulotlar (jadval)       | 6x10            |
| `expense_metrics`       | Xarajatlar ko'rsatkichlari     | 6x3             |
| `top_categories`        | Top kategoriyalar (doira)      | 6x10            |
| `region_products`       | Mintaqa bo'yicha mahsulotlar   | 6x8             |
| `product_trend`         | Mahsulot tendensiyasi (chiziq) | 6x10            |
| `debt_by_dealer`        | Diler bo'yicha qarz (bar)      | 6x8             |
| `debt_by_region`        | Mintaqa bo'yicha qarz (pie)    | 6x8             |
| `debt_trend`            | Qarz tendensiyasi (chiziq)     | 12x10           |
| `top_dealers`           | Top dilerlar (jadval)          | 12x8            |
| `overdue_receivables`   | Muddati o'tgan debitorlar      | 12x10           |

---

## ⚙️ Konfiguratsiya parametrlari

### Widget minimal o'lchamlari

Har bir widget uchun `minW` va `minH` belgilangan:

```typescript
{ i: 'kpi_sales', x: 0, y: 0, w: 3, h: 3, minW: 2, minH: 3 }
{ i: 'top_products', x: 0, y: 7, w: 6, h: 10, minW: 5, minH: 9 }
```

Bu parametrlar widget juda kichik bo'lib ketmasligini ta'minlaydi.

### Layout validatsiya

`handleLayoutChange` funksiyasi barcha layoutlarni tekshiradi:

```typescript
const fixedLayout = newLayout.map(item => ({
  ...item,
  y: Math.max(item.y, 0),    // Manfiy Y yo'q
  h: Math.max(item.h, 2),    // Min balandlik 2
  w: Math.max(item.w, 2),    // Min kenglik 2
}));
```

---

## 🎨 Dark mode support

Barcha drag & resize elementlari dark mode'da ham to'liq ishlaydi:

```css
/* Dark mode - resize handle */
[data-theme='dark'] .react-grid-item > .react-resizable-handle::after {
  border-right-color: rgba(255, 255, 255, 0.4);
  border-bottom-color: rgba(255, 255, 255, 0.4);
}

/* Dark mode - dragging shadow */
[data-theme='dark'] .react-grid-item.react-draggable-dragging {
  box-shadow: 0 10px 30px rgba(255, 255, 255, 0.2);
}

/* Dark mode - placeholder */
[data-theme='dark'] .react-grid-item.react-grid-placeholder {
  background: rgba(96, 165, 250, 0.15);
  border-color: rgba(96, 165, 250, 0.5);
}
```

---

## 🐛 Debugging

### Layout holatini tekshirish (Browser Console)

```javascript
// LocalStorage'dagi layoutni ko'rish
JSON.parse(localStorage.getItem('dashboardLayout_lg'))

// Hozirgi grid holatini ko'rish
document.querySelector('.react-grid-layout')
```

### Layout'ni reset qilish

```javascript
// LocalStorage'ni tozalash
localStorage.removeItem('dashboardLayout_lg')
localStorage.removeItem('dashboardLayout_md')
localStorage.removeItem('dashboardLayout_sm')
localStorage.removeItem('dashboardLayout_xs')

// Sahifani yangilash
location.reload()
```

---

## 📦 Dependency'lar

```json
{
  "react-grid-layout": "^1.x",
  "@types/react-grid-layout": "^1.x",
  "react-resizable": "^3.x"
}
```

Agar kutubxonalar o'rnatilmagan bo'lsa:

```bash
npm install react-grid-layout @types/react-grid-layout react-resizable
```

yoki

```bash
yarn add react-grid-layout @types/react-grid-layout react-resizable
```

---

## ✅ Afzalliklar

✅ **Drag va resize bir vaqtda ishlaydi**  
✅ **LocalStorage + Backend ikki tomonlama saqlash**  
✅ **Responsive 4 ta breakpoint**  
✅ **Chart va table'lar avtomatik moslashadi**  
✅ **Dark mode qo'llab-quvvatlaydi**  
✅ **Collision prevention o'chirilgan (erkin joylashtirish)**  
✅ **Minimal o'lchamlar bilan himoyalangan**  
✅ **Debounce bilan optimallashtirilgan saqlash**  

---

## 🔮 Kelajakda qo'shish mumkin

- Layout export/import funksiyasi (JSON)
- Widget ko'rsatish/yashirish toggle
- Layout preset'lar ("Sales Focus", "Finance Focus")
- Undo/Redo funksiyasi
- Breakpoint-specific layout'lar (har bir ekran o'lchami uchun alohida)

---

## 📞 Qo'llab-quvvatlash

Muammo yoki savol bo'lsa:
- GitHub Issues: [lenza_erp/issues](https://github.com/zokirbek85/lenza_erp/issues)
- Dokumentatsiya: `DASHBOARD_DRAG_RESIZE_GUIDE.md`

---

**Ishlab chiqildi:** Lenza ERP Team  
**Versiya:** 1.0.0  
**Sana:** Dekabr 2, 2025
