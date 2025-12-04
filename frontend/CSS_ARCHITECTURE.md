# Lenza ERP — CSS Architecture

## Design System Overview

Professional enterprise-grade CSS architecture with Design Tokens, Light/Dark themes, Mobile UX optimization, and comprehensive Ant Design integration.

---

## File Structure

```
frontend/src/
├── index.css                    # Main stylesheet (imports tokens)
└── styles/
    ├── tokens.brand.css        # Brand tokens (colors, spacing, typography)
    ├── tokens.light.css        # Light theme tokens
    └── tokens.dark.css         # Dark theme + system detection
```

---

## Design Token System

### Brand Tokens (`tokens.brand.css`)

**Colors:**
- `--lenza-gold: #d4af37` — Primary brand color
- `--lenza-graphite: #0f172a` — Secondary brand color

**Typography Scale:**
- Font sizes: 13px → 30px (7 levels)
- Weights: 400, 500, 600, 700
- Line heights: 1.25, 1.5, 1.75

**Spacing Scale:**
- `--space-1` to `--space-16` (4px → 64px)
- Based on 4px grid system

**Border Radius:**
- `--radius-sm: 6px` → `--radius-2xl: 20px`
- `--radius-full: 9999px` for circular elements

**Shadow Scale:**
- 5 levels: soft → lifted
- Adaptive opacity for light/dark modes

**Focus Ring:**
- `--focus-ring-width: 3px`
- `--focus-ring-color: rgba(212, 175, 55, 0.25)`

**Z-Index Scale:**
- Clear hierarchy from 0 → 3500
- Prevents overlap issues

---

### Light Theme (`tokens.light.css`)

```css
:root {
  --bg-base: #ffffff;
  --text-primary: #0f172a;
  --border-base: #e2e8f0;
  /* ... */
}
```

**Key Features:**
- High contrast for readability
- Subtle borders and shadows
- Professional gray palette

---

### Dark Theme (`tokens.dark.css`)

```css
[data-theme='dark'] {
  --bg-base: #0d1117;
  --text-primary: #f0f6fc;
  --border-base: #30363d;
  /* ... */
}
```

**Key Features:**
- GitHub-inspired dark palette
- Reduced eye strain
- Enhanced gold accent visibility
- System dark mode detection via `@media (prefers-color-scheme: dark)`

---

## Component Classes

### Utility Classes

**Card:**
```css
.lenza-card
```
- Adaptive background/border
- Hover lift effect
- Shadow transition

**Typography:**
```css
.lenza-text-primary
.lenza-text-secondary
.lenza-text-tertiary
```

**Brand Colors:**
```css
.lenza-gold
.lenza-bg-gold
```

---

### Form Components

**Input:**
```css
.lenza-input
```
- Unified focus halo (gold ring)
- Hover/disabled states
- Placeholder styling

**Buttons:**
```css
.lenza-btn-primary   # Gold background
.lenza-btn-secondary # Outlined style
```
- Transform on hover/active
- Shadow effects
- Disabled states

---

### Skeleton Loading

```css
.lenza-skeleton
.lenza-skeleton-text
.lenza-skeleton-title
.lenza-skeleton-avatar
```

**Animation:**
- 1.6s shimmer effect
- Gradient background
- Adapts to theme

---

## Ant Design Overrides

All Ant Design components styled to match Lenza brand:

- **Buttons:** Gold primary with lift effect
- **Inputs/Select:** Unified focus ring (gold)
- **DatePicker:** Theme-adaptive
- **Modal:** Rounded corners + lifted shadow
- **Table:** Hover states + zebra striping
- **Card:** Soft shadows + hover effect
- **Drawer/Tabs/Switch:** Brand colors

---

## Mobile Optimization

### Touch Targets
- Minimum 44px height for all interactive elements
- Prevents iOS zoom with `font-size: 16px`

### Classes:
```css
.mobile-btn
.mobile-card
.mobile-form-field
.mobile-sticky-footer
.mobile-safe-area
.mobile-action-btn
```

### iOS Support:
- Safe area insets (`env(safe-area-inset-*)`)
- `-webkit-overflow-scrolling: touch`
- `-webkit-tap-highlight-color: transparent`

---

## React Grid Layout

### Dashboard Widgets

**Features:**
- GPU acceleration (`transform: translateZ(0)`)
- Smooth drag/resize with `will-change`
- Premium tint overlay during drag
- Responsive resize handles

**Classes:**
```css
.react-grid-layout
.react-grid-item
.drag-handle
```

**Optimization:**
- No content overflow
- Proper flex structure
- Recharts responsive wrapper

---

## Scrollbar Styling

### Light Mode:
- Gradient thumb (base → strong)
- Gold on hover

### Dark Mode:
- Gradient thumb (visible but subtle)
- Gold accent on hover

---

## Z-Index Hierarchy

```
--z-base:           0
--z-dropdown:    1000
--z-sticky:      1100
--z-fixed:       1200
--z-modal:       2800
--z-drawer:      3000
--z-mobile-sticky: 3200
--z-tooltip:     3500
```

**Prevents overlap issues** in modals, drawers, mobile forms.

---

## Performance

### Optimizations:
1. **GPU Acceleration:**
   - `transform: translateZ(0)`
   - `backface-visibility: hidden`

2. **Reduced Motion:**
   - Respects `prefers-reduced-motion`
   - Disables animations for accessibility

3. **Selective Transitions:**
   - Only necessary properties animated
   - No global `* { transition }` overhead

---

## Usage

### Import Order (automatic via `index.css`):
```css
@import './styles/tokens.brand.css';
@import './styles/tokens.light.css';
@import './styles/tokens.dark.css';
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Switching Themes:
```html
<body data-theme="dark">
```
or let system detection handle it automatically.

---

## Extending

### Adding New Colors:
1. Add to `tokens.brand.css`
2. Create light/dark variants in theme files
3. Use CSS variables in components

### Adding New Spacing:
1. Follow 4px grid (`--space-X`)
2. Update both theme files if adaptive

### Adding New Components:
1. Use token variables (not hard-coded values)
2. Support light/dark modes
3. Add hover/focus/disabled states

---

## PDF/Excel Export Compatibility

Design tokens are structured to be easily converted to JSON/JS objects for export engines:

```js
const designTokens = {
  colors: {
    gold: '#d4af37',
    graphite: '#0f172a'
  },
  spacing: {
    base: '16px',
    lg: '24px'
  },
  typography: {
    fontFamily: 'Inter, system-ui',
    fontSize: '15px'
  }
};
```

---

## Browser Support

- **Modern browsers:** Chrome, Firefox, Safari, Edge (latest 2 versions)
- **iOS Safari:** 14+
- **Android Chrome:** 90+

**Features:**
- CSS Custom Properties (CSS Variables)
- CSS Grid & Flexbox
- `env()` for safe areas
- `@media (prefers-color-scheme)`

---

## Maintenance

### Rules:
1. **Never** hard-code colors/spacing/shadows
2. **Always** use token variables
3. Test changes in **both** light and dark modes
4. Verify mobile touch targets (44px minimum)
5. Check z-index hierarchy before adding new overlays

---

## Migration from Old CSS

**Replaced:**
- `var(--text-color)` → `var(--text-primary)`
- `var(--card-bg)` → `var(--bg-elevated)`
- `var(--border-color)` → `var(--border-base)`
- Hard-coded transitions → Token-based
- Global `*` transitions → Selective component transitions

**Added:**
- Skeleton loading system
- Mobile-first touch targets
- Unified focus ring
- GPU-accelerated animations
- Comprehensive Ant Design overrides

---

## Credits

**Design System:** Lenza ERP Team  
**Palette:** Gold + Graphite + Minimal Dark  
**Inspiration:** GitHub Dark, Tailwind UI, Ant Design Pro
