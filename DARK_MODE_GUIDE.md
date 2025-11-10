# 🌓 Lenza ERP - Dark Mode Implementation Guide

## ✅ Bajarilgan Ishlar

### 1. **ThemeContext yaratildi** (`frontend/src/context/ThemeContext.tsx`)
- Global tema boshqaruvi (light/dark)
- Ant Design ConfigProvider integratsiyasi
- `darkAlgorithm` va `defaultAlgorithm` almashinuvi
- localStorage orqali tema saqlash
- `data-theme` attribute HTML root elementiga qo'shiladi

**Asosiy funksiyalar:**
```typescript
const { mode, toggleTheme, setTheme } = useTheme();
```

### 2. **App.tsx yangilandi**
- `ThemeProvider` bilan butun ilovani o'rab olindi
- `ConfigProvider` avtomatik ravishda barcha Ant Design komponentlariga tema beradi
- Loading fallback Spin komponenti bilan almashtirildi

### 3. **Global CSS Variables** (`frontend/src/index.css`)
- `[data-theme='light']` va `[data-theme='dark']` selectorlar
- CSS custom properties:
  - `--bg-color`, `--bg-secondary`, `--bg-elevated`
  - `--text-color`, `--text-secondary`
  - `--card-bg`, `--border-color`, `--shadow`
  - `--lenza-gold` (#d4af37), `--lenza-black` (#0f172a)
- Smooth transitions (0.2s ease)
- Custom scrollbar uchun dark mode styling

### 4. **Layout.tsx migratsiya qilindi**
- Local `darkMode` state o'rniga `useTheme()` hook ishlatilmoqda
- Dark mode tugmasida ☀️/🌙 emoji ko'rsatiladi
- Tema o'zgarishi faqat ThemeContext orqali boshqariladi

### 5. **Chart.js komponentlari yangilandi** (`DashboardCharts.tsx`)

**Quyidagi chartlar theme-aware:**
- ✅ `RevenueTrendChart` - Bar chart
- ✅ `RevenueSharePie` - Doughnut chart  
- ✅ `InventoryTrendLine` - Line chart
- ✅ `ExpensesGauge` - SVG gauge

**Dynamic ranglar:**
```typescript
const { token } = theme.useToken();
const { mode } = useTheme();
const isDark = mode === 'dark';

// Chart tooltip colors
backgroundColor: isDark ? '#2a2a2a' : '#ffffff',
titleColor: token.colorText,
bodyColor: token.colorTextSecondary,
borderColor: token.colorBorder,
```

### 6. **KpiCard komponenti** (`KpiCard.tsx`)
- `theme.useToken()` orqali dynamic ranglar
- Card fon: `token.colorBgContainer`
- Matn ranglari: `token.colorText`, `token.colorTextSecondary`
- Icon container: Dark mode-da `#2a2a2a`, light mode-da `#f8fafc`
- Hover effektlari saqlanib qoldi

### 7. **DashboardTable komponenti** (`DashboardTable.tsx`)
- Table background: `token.colorBgContainer`
- Badge ranglar dark mode uchun moslashtirildi:
  - 30+ days overdue: Dark (`#7f1d1d`/`#fca5a5`) | Light (`#fee2e2`/`#991b1b`)
  - 15+ days: Dark (`#78350f`/`#fcd34d`) | Light (`#fef3c7`/`#92400e`)
  - < 15 days: Dark (`#1e3a8a`/`#93c5fd`) | Light (`#dbeafe`/`#1e40af`)

### 8. **Ant Design Komponentlari**
ConfigProvider orqali avtomatik tema qo'llab-quvvatlanadi:
- ✅ Card
- ✅ Table
- ✅ Modal
- ✅ Drawer
- ✅ Select
- ✅ Input
- ✅ Collapse
- ✅ DatePicker
- ✅ Button

## 🎨 Tema Tokenlar

### Light Mode
```typescript
colorBgContainer: '#ffffff'
colorText: '#000000'
colorTextSecondary: '#666666'
colorBorder: '#d9d9d9'
colorPrimary: '#d4af37' // Lenza Gold
```

### Dark Mode
```typescript
colorBgContainer: '#1e1e1e'
colorText: '#e8e8e8'
colorTextSecondary: '#a6a6a6'
colorBorder: '#424242'
colorPrimary: '#d4af37' // Lenza Gold (o'zgarmaydi)
```

## 🧪 Test Qilish

### 1. **Dark Mode Toggle**
```
Layout → Header → 🌙 Dark Mode tugmasi → ☀️ Light Mode
```

### 2. **Tekshirish Kerak Bo'lgan Sahifalar:**
- ✅ Dashboard (KPI cards, charts, table)
- ✅ Notifications
- ⚠️ Orders
- ⚠️ Products
- ⚠️ Dealers
- ⚠️ Payments
- ⚠️ Users

### 3. **Komponentlar Testi:**
```bash
# Browser console-da:
document.documentElement.getAttribute('data-theme')  // 'dark' yoki 'light'
document.documentElement.classList.contains('dark')  // true yoki false
localStorage.getItem('lenza_theme')  // 'dark' yoki 'light'
```

### 4. **Chart.js Tooltip Testi:**
- Light mode: Oq fon, qora matn
- Dark mode: Qora fon (#2a2a2a), oq matn

### 5. **Table Rows Hover:**
- Light: `#f5f5f5`
- Dark: `#303030` (Ant Design token)

## 🚀 Ishga Tushirish

```bash
cd d:\Project\new\lenza_erp\frontend
npm run dev
```

Browser-da `http://localhost:5173` ochiladi.

## 📝 Qolgan Ishlar (Opsional)

### 1. **Boshqa Sahifalarni Yangilash**
Agar quyidagi sahifalarda hardcoded ranglar bo'lsa, ularni `theme.useToken()` bilan almashtirish:
- `frontend/src/pages/Orders.tsx`
- `frontend/src/pages/Products.tsx`
- `frontend/src/pages/Dealers.tsx`
- `frontend/src/pages/Payments.tsx`

**Pattern:**
```tsx
import { theme } from 'antd';
import { useTheme } from '../context/ThemeContext';

const { token } = theme.useToken();
const { mode } = useTheme();

// O'rniga:
style={{ background: '#fff' }}

// Ishlatish:
style={{ background: token.colorBgContainer }}
```

### 2. **NotificationBell Komponenti**
Agar Popover/Drawer fon ranglari o'zgarmasa:
```tsx
<Popover
  overlayStyle={{
    backgroundColor: token.colorBgElevated,
  }}
>
```

### 3. **Custom Modal/Drawer**
```tsx
<Modal
  styles={{
    body: { backgroundColor: token.colorBgContainer },
    header: { backgroundColor: token.colorBgContainer },
  }}
>
```

### 4. **Debug Console Log O'chirish**
`DashboardFilterBar.tsx` faylidagi debug console.log statementlarini olib tashlash:
```typescript
// O'chirish kerak:
console.log('Dealers response:', dealersRes.data);
console.log('Regions response:', regionsRes.data);
console.log('Managers response:', managersRes.data);
```

## 🎯 Natija

✅ **Global tema tizimi ishlamoqda**  
✅ **Ant Design komponentlari avtomatik dark mode qo'llab-quvvatlaydi**  
✅ **Chart.js grafiklari dark mode-da to'g'ri ko'rinadi**  
✅ **Custom komponentlar (KpiCard, DashboardTable) theme-aware**  
✅ **CSS variables orqali consistent ranglar**  
✅ **localStorage orqali tema saqlanadi**  
✅ **Smooth transitions**  
✅ **Lenza gold accent (#d4af37) saqlanib qoladi**

---

## 🔍 Muammolarni Bartaraf Etish

### Agar tema o'zgarmasa:
1. Browser console ochib xatolarni tekshiring
2. `localStorage.getItem('lenza_theme')` qiymatini tekshiring
3. `document.documentElement.getAttribute('data-theme')` tekshiring
4. Browser cache-ni tozalang (Ctrl+Shift+R)

### Agar chart fon oq bo'lib qolsa:
Chart konteyner Card komponentini tekshiring - Card endi grafiklarni o'rab olmaydi, faqat DashboardPage.tsx-da Card wrapperlari qoldi.

### Agar Table dark bo'lmasa:
ConfigProvider to'g'ri ishlashini tekshiring - App.tsx-da ThemeProvider mavjudligini tasdiqlang.

---

**Muallif:** GitHub Copilot  
**Sana:** 2025-11-10  
**Versiya:** 1.0  
