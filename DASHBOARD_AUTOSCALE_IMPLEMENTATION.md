# Dashboard Widget Autoscale Implementation Guide

## 🎯 Umumiy ma'lumot

Lenza ERP dashboardidagi barcha widgetlar **avtomatik moslashuvchan** — drag & resize qilinsa, ichidagi kontent (chart, table, text, icon) **avtomatik o'lchamini moslashtiradi**.

---

## 🧩 Texnologiya

### 1. **useAutoscale Hook**

Universal hook barcha widgetlar uchun o'lcham parametrlarini hisoblaydi.

**Fayl:** `frontend/src/hooks/useAutoscale.ts`

```typescript
import { useAutoscale } from '../hooks/useAutoscale';

const containerRef = useRef<HTMLDivElement>(null);
const { width, height, fontSize, titleFontSize, chartPadding, rowCount, barSize, iconSize, cardPadding } = useAutoscale(containerRef);
```

### 2. **ResizeObserver API**

Real-time widget o'lcham o'zgarishini kuzatish:

```typescript
useLayoutEffect(() => {
  const resizeObserver = new ResizeObserver((entries) => {
    const { width, height } = entries[0].contentRect;
    setDimensions({ width, height });
  });
  
  resizeObserver.observe(ref.current);
  return () => resizeObserver.disconnect();
}, [ref]);
```

---

## 📐 Autoscale parametrlari

| Parametr        | Formula                  | Min   | Max   | Maqsad                          |
|-----------------|--------------------------|-------|-------|---------------------------------|
| `fontSize`      | `height * 0.08`          | 12px  | 28px  | Asosiy matn o'lchami            |
| `titleFontSize` | `fontSize + 4`           | 16px  | 32px  | Sarlavha o'lchami               |
| `chartPadding`  | `height * 0.1`           | 20px  | 60px  | Chart ichki bo'sh joy           |
| `rowCount`      | `height / 48`            | 3     | ∞     | Jadval qator soni               |
| `barSize`       | `width * 0.08`           | 15px  | 80px  | Bar chart ustun kengligi        |
| `iconSize`      | `height * 0.15`          | 24px  | 48px  | Icon o'lchami                   |
| `cardPadding`   | `height * 0.05`          | 12px  | 24px  | Card ichki padding              |

---

## 🎨 Komponent turlariga qo'llash

### 1️⃣ **KPI Card (Statistic Card)**

**Fayl:** `frontend/src/components/KpiCard.tsx`

**Autoscale parametrlari:**
- Title font: `fontSize * 0.5`
- Value font: `titleFontSize` (16-32px)
- Icon size: `iconSize` (24-48px)
- Card padding: `cardPadding` (12-24px)

**Kod misol:**
```tsx
const containerRef = useRef<HTMLDivElement>(null);
const { fontSize, titleFontSize, iconSize, cardPadding } = useAutoscale(containerRef);

<div ref={containerRef} style={{ height: '100%', width: '100%' }}>
  <Card styles={{ body: { padding: `${cardPadding}px` } }}>
    <p style={{ fontSize: `${fontSize * 0.5}px` }}>{title}</p>
    <Statistic valueStyle={{ fontSize: `${titleFontSize}px` }} />
    <div style={{ width: `${iconSize}px`, height: `${iconSize}px` }}>
      {icon}
    </div>
  </Card>
</div>
```

---

### 2️⃣ **Table (Jadval)**

**Fayl:** `frontend/src/components/analytics/TopProductsCard.tsx`

**Autoscale parametrlari:**
- Row count: `rowCount` (min 3)
- Table font: `fontSize * 0.7`
- Title font: `fontSize`

**Kod misol:**
```tsx
const containerRef = useRef<HTMLDivElement>(null);
const { fontSize, rowCount } = useAutoscale(containerRef);

const visibleData = data.slice(0, Math.max(3, rowCount));

<div ref={containerRef} style={{ height: '100%', width: '100%' }}>
  <Card title={<span style={{ fontSize: `${fontSize}px` }}>Title</span>}>
    <Table 
      dataSource={visibleData}
      style={{ fontSize: `${fontSize * 0.7}px` }}
      pagination={false}
    />
  </Card>
</div>
```

---

### 3️⃣ **Chart.js (Bar/Line Chart)**

**Fayl:** `frontend/src/components/DebtByDealerChart.tsx`

**Autoscale parametrlari:**
- Chart height: `height - 120` (card header/padding)
- Axis font: `fontSize * 0.6`
- Tooltip font: `fontSize * 0.7`
- Chart padding: `chartPadding`

**Kod misol:**
```tsx
const containerRef = useRef<HTMLDivElement>(null);
const { height, fontSize, chartPadding } = useAutoscale(containerRef);

const chartHeight = Math.max(200, height - 120);

const options: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false, // CRITICAL!
  plugins: {
    tooltip: {
      bodyFont: { size: fontSize * 0.7 },
    },
  },
  scales: {
    x: { ticks: { font: { size: fontSize * 0.6 } } },
    y: { ticks: { font: { size: fontSize * 0.6 } } },
  },
  layout: { padding: chartPadding },
};

<div ref={containerRef} style={{ height: '100%' }}>
  <Card styles={{ body: { flex: 1 } }}>
    <div style={{ height: chartHeight }}>
      <Bar data={chartData} options={options} />
    </div>
  </Card>
</div>
```

---

### 4️⃣ **Recharts (Pie/Line/Bar)**

**Fayllar:**
- `frontend/src/components/analytics/TopCategoriesCard.tsx` (Pie)
- `frontend/src/components/analytics/ProductTrendLineChart.tsx` (Line)

**Autoscale parametrlari:**
- Pie radius: `Math.min(width, height) * 0.25`
- Line stroke width: `fontSize * 0.1`
- Dot radius: `fontSize * 0.2`
- Axis tick font: `fontSize * 0.6`
- Legend font: `fontSize * 0.6`

**Kod misol (Pie):**
```tsx
const containerRef = useRef<HTMLDivElement>(null);
const { width, height, fontSize } = useAutoscale(containerRef);

const outerRadius = Math.max(50, Math.min(width, height) * 0.25);
const chartHeight = Math.max(200, height - 120);

<div ref={containerRef} style={{ height: '100%' }}>
  <Card>
    <ResponsiveContainer width="100%" height={chartHeight}>
      <PieChart>
        <Pie 
          outerRadius={outerRadius}
          style={{ fontSize: `${fontSize * 0.7}px` }}
        />
        <Legend wrapperStyle={{ fontSize: `${fontSize * 0.6}px` }} />
      </PieChart>
    </ResponsiveContainer>
  </Card>
</div>
```

**Kod misol (Line):**
```tsx
const containerRef = useRef<HTMLDivElement>(null);
const { height, fontSize, chartPadding } = useAutoscale(containerRef);

const chartHeight = Math.max(200, height - 120);
const tickFontSize = Math.max(10, fontSize * 0.6);
const strokeWidth = Math.max(1, fontSize * 0.1);

<div ref={containerRef} style={{ height: '100%' }}>
  <Card>
    <ResponsiveContainer width="100%" height={chartHeight}>
      <LineChart margin={{ top: chartPadding, right: chartPadding }}>
        <XAxis tick={{ fontSize: tickFontSize }} />
        <YAxis tick={{ fontSize: tickFontSize }} />
        <Legend wrapperStyle={{ fontSize: `${fontSize * 0.6}px` }} />
        <Line 
          strokeWidth={strokeWidth * 2}
          dot={{ r: fontSize * 0.2 }}
          activeDot={{ r: fontSize * 0.3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  </Card>
</div>
```

---

## 🔧 Umumiy pattern

Har bir widget uchun ushbu strukturani qo'llang:

```tsx
import { useRef } from 'react';
import { useAutoscale } from '../hooks/useAutoscale';

const MyWidget = ({ data }) => {
  // 1. Ref yaratish
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 2. Autoscale hook
  const { width, height, fontSize, /* ... */ } = useAutoscale(containerRef);
  
  // 3. Widget-specific calculations
  const chartHeight = Math.max(200, height - 120);
  const visibleRows = Math.max(3, rowCount);
  
  // 4. Return with ref
  return (
    <div ref={containerRef} style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Widget content */}
      </Card>
    </div>
  );
};
```

---

## ✅ Implemented widgetlar

| Widget ID             | Komponent                          | Autoscale parametrlari                           | Fayl                                           |
|-----------------------|------------------------------------|--------------------------------------------------|------------------------------------------------|
| `kpi_*`               | KpiCard                            | fontSize, iconSize, cardPadding                  | `components/KpiCard.tsx`                       |
| `top_products`        | TopProductsCard                    | fontSize, rowCount                               | `components/analytics/TopProductsCard.tsx`     |
| `debt_by_dealer`      | DebtByDealerChart (Chart.js Bar)   | fontSize, chartPadding, height                   | `components/DebtByDealerChart.tsx`             |
| `top_categories`      | TopCategoriesCard (Recharts Pie)   | fontSize, outerRadius, width, height             | `components/analytics/TopCategoriesCard.tsx`   |
| `product_trend`       | ProductTrendLineChart (Line)       | fontSize, chartPadding, strokeWidth, dotRadius   | `components/analytics/ProductTrendLineChart.tsx`|

---

## 🚧 Qo'shilishi kerak (TODO)

| Widget ID             | Komponent                          | Priority |
|-----------------------|------------------------------------|----------|
| `debt_by_region`      | DebtByRegionPie (Chart.js Pie)     | High     |
| `debt_trend`          | DebtTrendChart (Chart.js Line)     | High     |
| `region_products`     | RegionProductHeatmap               | Medium   |
| `top_dealers`         | TopDealersCard (Table)             | Medium   |
| `overdue_receivables` | DashboardTable (Table)             | Medium   |
| `expense_metrics`     | ExpenseMetrics (Mini cards)        | Low      |
| `inventory_stats`     | Custom Card                        | Low      |

---

## 🎯 Key principles

### 1. **Container ref** — har doim eng tashqi `<div>` ga
```tsx
<div ref={containerRef} style={{ height: '100%', width: '100%' }}>
```

### 2. **maintainAspectRatio: false** — Chart.js uchun **MAJBURIY**
```tsx
const options = {
  maintainAspectRatio: false, // ❗️ Bu bo'lmasa chart resize bo'lmaydi
  responsive: true,
};
```

### 3. **ResponsiveContainer** — Recharts uchun **MAJBURIY**
```tsx
<ResponsiveContainer width="100%" height={chartHeight}>
  <PieChart>{/* ... */}</PieChart>
</ResponsiveContainer>
```

### 4. **Flexbox layout** — Card body uchun
```tsx
<Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
  <Card.Body style={{ flex: 1, overflow: 'auto' }}>
```

### 5. **Min values** — juda kichik widgetlar uchun himoya
```tsx
const fontSize = Math.max(12, height * 0.08); // Min 12px
const chartHeight = Math.max(200, height - 120); // Min 200px
const rowCount = Math.max(3, Math.floor(height / 48)); // Min 3 rows
```

---

## 🐛 Troubleshooting

### ❌ Chart resize bo'lmayapti
**Sabab:** `maintainAspectRatio: true` (default)  
**Yechim:**
```tsx
const options = { maintainAspectRatio: false };
```

### ❌ Chart katta widgetda ham kichik ko'rinadi
**Sabab:** Fixed height berilgan  
**Yechim:**
```tsx
// ❌ Noto'g'ri
<div style={{ height: 320 }}>

// ✅ To'g'ri
const chartHeight = Math.max(200, height - 120);
<div style={{ height: chartHeight }}>
```

### ❌ Table barcha qatorlarni ko'rsatyapti
**Sabab:** `rowCount` ishlatilmagan  
**Yechim:**
```tsx
const visibleData = data.slice(0, Math.max(3, rowCount));
<Table dataSource={visibleData} />
```

### ❌ Icon/text juda kichik
**Sabab:** `fontSize` to'g'ri scaled bo'lmagan  
**Yechim:**
```tsx
// Icon uchun
style={{ fontSize: `${iconSize * 0.5}px` }}

// Matn uchun
style={{ fontSize: `${fontSize}px` }}
```

---

## 📊 Performance

- **ResizeObserver** — native browser API, juda tez
- **Debounce yoq** — real-time resize
- **Re-render count** — minimal (faqat o'lcham o'zgarganda)
- **Memory leak** — yo'q (cleanup function bor)

---

## 📚 Qo'shimcha resurslar

- [ResizeObserver MDN](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver)
- [Chart.js Responsive](https://www.chartjs.org/docs/latest/configuration/responsive.html)
- [Recharts ResponsiveContainer](https://recharts.org/en-US/api/ResponsiveContainer)
- [React Grid Layout](https://github.com/react-grid-layout/react-grid-layout)

---

**Ishlab chiqildi:** Lenza ERP Team  
**Versiya:** 1.0.0  
**Sana:** Dekabr 2, 2025
