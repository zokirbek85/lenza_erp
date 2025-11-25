# Mobile UX Testing Checklist - Lenza ERP

## Test Devices Configuration

### 1. Test Devices
- **iPhone SE (375px × 667px)** - Smallest modern iPhone
- **iPhone 13 (390px × 844px)** - Standard iPhone
- **Android Small (360px × 800px)** - Standard Android
- **iPad Mini (768px × 1024px)** - Tablet breakpoint
- **Desktop (1280px × 720px)** - Desktop view

### 2. Test Browsers
- **Mobile Safari** (iOS)
- **Chrome Mobile** (Android)
- **Chrome DevTools** (Device emulation)

---

## General UX Tests

### Layout & Navigation
- [ ] Sidebar collapses to drawer on mobile (<768px)
- [ ] Header fits without horizontal scroll
- [ ] Burger menu opens/closes correctly
- [ ] Navigation links work in drawer
- [ ] No horizontal scroll on any page
- [ ] Content uses full width on mobile
- [ ] Fixed elements don't overlap content

### Touch Interactions
- [ ] All buttons have min 44px × 44px touch target
- [ ] Form inputs have min 44px height
- [ ] No double-tap zoom on inputs (16px font size)
- [ ] Swipe gestures work naturally
- [ ] No accidental clicks from small targets

### Typography & Readability
- [ ] Font sizes readable at arm's length
- [ ] Labels have proper contrast
- [ ] Error messages visible and clear
- [ ] No text cutoff or overflow

---

## Module-Specific Tests

### Orders Module (`/orders`)

#### List View
- [ ] Orders display as cards (not table) on mobile
- [ ] Each card shows: ID, dealer, status, amount, date
- [ ] Status badges color-coded correctly
- [ ] Cards have proper spacing (12-16px)
- [ ] Tap on card expands details
- [ ] "View" button opens details
- [ ] Pagination controls accessible

#### Filter Drawer
- [ ] "Filters" button visible at top
- [ ] Drawer opens from bottom (70% height)
- [ ] Dealer, brand, category selects touch-friendly
- [ ] Date pickers work correctly
- [ ] "Apply" and "Reset" buttons accessible
- [ ] Drawer closes on backdrop tap

#### Create Order Form (Mobile)
- [ ] "Create Order" button opens full-screen drawer
- [ ] Close button (X) visible and accessible
- [ ] Dealer select: min 44px height, 16px font
- [ ] Order type toggle works correctly
- [ ] Product search: autocomplete functional
- [ ] Brand/category filters apply immediately
- [ ] Product dropdown shows stock status
- [ ] Quantity input: numeric keyboard on mobile
- [ ] Price input: numeric keyboard on mobile
- [ ] "Add Product" button adds to order items list
- [ ] Order items display as cards (not table)
- [ ] Each item card shows: name, qty, price, total
- [ ] Tap item card to expand edit fields
- [ ] Inline qty/price editing works
- [ ] Delete button removes item (with confirmation)
- [ ] Total amount displays prominently
- [ ] Fixed bottom bar shows: Total + Clear + Create
- [ ] Bottom bar visible above mobile keyboard
- [ ] Bottom bar respects safe area insets
- [ ] Form scrolls smoothly with keyboard
- [ ] Create button submits order correctly
- [ ] Clear draft button clears all items
- [ ] Success toast appears after creation
- [ ] Form closes and redirects to orders list

#### Landscape Orientation
- [ ] Form still usable in landscape mode
- [ ] No layout breaks or cutoffs
- [ ] Keyboard doesn't hide critical fields

---

### Payments Module (`/payments`)

#### List View
- [ ] Payments display as cards on mobile
- [ ] Each card shows: dealer, amount, status, date, creator
- [ ] Status badges: pending (yellow), approved (green), rejected (red)
- [ ] Amount displays in both USD and UZS
- [ ] Actions menu (3 dots) shows approve/reject/delete
- [ ] Receipt image thumbnail (if exists)
- [ ] "View Receipt" opens full screen
- [ ] Pagination works correctly

#### Filter Drawer
- [ ] Dealer filter select touch-friendly
- [ ] Date range pickers work on mobile
- [ ] Status filter select functional
- [ ] Apply/Reset buttons accessible

#### Create Payment Form (Mobile)
- [ ] "Create Payment" opens full-screen drawer
- [ ] Close button accessible
- [ ] Dealer select: min 44px, 16px font
- [ ] Payment date picker: max = today
- [ ] Amount input: numeric keyboard, decimal support
- [ ] Currency toggle (USD/UZS) works
- [ ] Exchange rate select shows date and rate
- [ ] Method select (cash/card/transfer) functional
- [ ] Card select appears only if method = card
- [ ] Note textarea: 16px font, multi-line
- [ ] Receipt upload: camera access on mobile
- [ ] Image preview shows uploaded receipt
- [ ] "Preview" button opens full-screen image
- [ ] "Remove" button deletes image
- [ ] Upload progress indicator visible
- [ ] Fixed bottom bar: Cancel + Save buttons
- [ ] Save button disabled while uploading
- [ ] Form validates before submission
- [ ] Success toast after save
- [ ] Form closes after successful save

#### Approval Actions (Admin/Accountant)
- [ ] Approve button accessible (green)
- [ ] Reject button accessible (red)
- [ ] Confirmation modal appears
- [ ] Modal closable on mobile
- [ ] Status updates immediately after action

---

### Products Module (`/products`)

#### List View
- [ ] Products display as cards (not table)
- [ ] Each card shows: name, SKU, brand, price, stock
- [ ] Stock badges: green (in stock), red (out of stock)
- [ ] Product image thumbnail (if exists)
- [ ] Actions: View, Edit, Delete (3 dots menu)
- [ ] Search bar functional
- [ ] Brand/category filters work
- [ ] Pagination accessible

#### Filter Drawer
- [ ] Brand select touch-friendly
- [ ] Category select touch-friendly
- [ ] Search input: 16px font
- [ ] Apply/Reset buttons work

#### Create/Edit Product Form (Mobile)
- [ ] "Create Product" opens full-screen drawer
- [ ] Close button accessible
- [ ] Image upload section at top
- [ ] Image preview shows uploaded image
- [ ] "Preview" button opens full-screen
- [ ] "Remove" button deletes image
- [ ] SKU input: 16px font
- [ ] Name input: 16px font, auto-focus
- [ ] Brand select: min 44px height
- [ ] Category select: min 44px height
- [ ] Sell price input: numeric keyboard, USD suffix
- [ ] Stock OK input: numeric keyboard, decimal
- [ ] Stock defect input: numeric keyboard, decimal
- [ ] Sections grouped visually (Basic Info, Pricing, Stock)
- [ ] Fixed bottom bar: Cancel + Save/Update
- [ ] Save button disabled during upload
- [ ] Form validates before submission
- [ ] Error messages display per field
- [ ] Success toast after save
- [ ] Form closes and list refreshes

#### Image Upload
- [ ] Camera access on mobile devices
- [ ] Photo library access on mobile
- [ ] Image preview before upload
- [ ] Upload progress indicator
- [ ] Max file size validation (5MB)
- [ ] Image format validation (jpg, png)

---

### Catalog Module (`/catalog`)

#### List View - Cards Mode
- [ ] Products display as grouped cards
- [ ] Each card shows: base name, brand, total stock
- [ ] Stock breakdown by width (400-900mm)
- [ ] Width badges display correctly
- [ ] Product image fits card
- [ ] "No stock" indicator when empty
- [ ] Cards are 1 column on mobile
- [ ] Card spacing: 12-16px

#### List View - Gallery Comfort
- [ ] 2 columns on mobile (360px+)
- [ ] Image height: 128px
- [ ] Product name: 3 lines max
- [ ] Brand displayed below name
- [ ] Stock badges below brand
- [ ] Total stock in corner badge

#### List View - Gallery Compact
- [ ] 2 columns on mobile
- [ ] Image height: 128px
- [ ] Product name: 2 lines max
- [ ] Stock badges compact format

#### List View - Gallery Ultra
- [ ] 3 columns on mobile (360px+)
- [ ] Image height: 80px
- [ ] Product name: 2 lines max
- [ ] Total stock badge only
- [ ] Brand hidden to save space

#### Filter Drawer
- [ ] "Filters" button at top
- [ ] Drawer opens from bottom
- [ ] Brand select functional
- [ ] Search input: 16px font, debounced
- [ ] View mode segmented control (4 options)
- [ ] Apply/Reset buttons work

#### Actions Menu (Mobile)
- [ ] "Actions" button (3 dots) at top right
- [ ] Dropdown menu opens on tap
- [ ] "Export PDF" action functional
- [ ] "Export Excel" action functional
- [ ] Menu closes after selection
- [ ] Loading indicator during export

#### Product Detail (Tap Card)
- [ ] Modal/drawer opens with full details
- [ ] Large product image
- [ ] Base name and brand
- [ ] Stock breakdown table by width
- [ ] Close button accessible

---

## Performance Tests

### Loading States
- [ ] Skeleton loaders display during fetch
- [ ] Spinner visible during form submission
- [ ] Upload progress indicators work
- [ ] No blank screens or flashes

### Scroll Performance
- [ ] Lists scroll smoothly (60fps)
- [ ] Infinite scroll/pagination works
- [ ] Pull-to-refresh (if implemented)
- [ ] No scroll jank or lag

### Network Conditions
- [ ] Works on 3G network
- [ ] Works on 4G network
- [ ] Works offline (if applicable)
- [ ] Graceful degradation on slow network
- [ ] Error messages for failed requests

---

## Accessibility Tests

### Screen Readers
- [ ] All buttons have aria-labels
- [ ] Form inputs have associated labels
- [ ] Error messages announced
- [ ] Status changes announced

### Keyboard Navigation
- [ ] Tab order logical
- [ ] Enter key submits forms
- [ ] Escape key closes drawers
- [ ] Focus visible on interactive elements

### Color Contrast
- [ ] Text meets WCAG AA (4.5:1 minimum)
- [ ] Buttons have sufficient contrast
- [ ] Status badges readable
- [ ] Dark mode maintains contrast

---

## Dark Mode Tests

### Theme Consistency
- [ ] All components render in dark mode
- [ ] Background colors inverted correctly
- [ ] Text colors readable
- [ ] Border colors visible
- [ ] Shadows adapted for dark theme
- [ ] Images have proper contrast

### Theme Toggle
- [ ] Toggle button accessible
- [ ] Theme persists across sessions
- [ ] No flash of wrong theme on load

---

## Form Validation Tests

### Field Validation
- [ ] Required fields show error when empty
- [ ] Email format validation works
- [ ] Number min/max validation works
- [ ] Date validation (past dates, future dates)
- [ ] File size validation works
- [ ] File type validation works

### Submission
- [ ] Submit button disabled during submission
- [ ] Success message displays after save
- [ ] Error message displays on failure
- [ ] Form doesn't clear on error
- [ ] Form clears on success (or redirects)

---

## Keyboard Behavior Tests

### Mobile Keyboard
- [ ] Numeric keyboard for number inputs
- [ ] Email keyboard for email inputs
- [ ] URL keyboard for URL inputs
- [ ] Date picker for date inputs
- [ ] Input doesn't zoom on focus (16px font)
- [ ] Form scrolls to keep field above keyboard
- [ ] Submit button accessible above keyboard
- [ ] Keyboard closes on form submission

---

## Critical Bugs to Check

### iOS Safari Specific
- [ ] Input zoom disabled (16px font)
- [ ] Fixed position elements don't glitch
- [ ] 100vh height works correctly
- [ ] Swipe-back gesture doesn't break navigation
- [ ] Date pickers use native iOS picker

### Android Chrome Specific
- [ ] Select dropdowns work correctly
- [ ] File upload works (camera + gallery)
- [ ] Fixed elements don't cover content
- [ ] Back button closes drawers first

### Common Issues
- [ ] No horizontal scroll anywhere
- [ ] Images load correctly
- [ ] Icons render properly
- [ ] Animations don't cause layout shifts
- [ ] Toast notifications visible and dismissable

---

## Regression Testing

After any code change, re-test:
- [ ] Forms still open/close correctly
- [ ] Navigation still works
- [ ] Bottom bars still fixed
- [ ] Keyboard behavior unchanged
- [ ] Dark mode still works
- [ ] Desktop view unchanged

---

## Testing Tools

### Browser DevTools
```bash
# Chrome DevTools Device Emulation
Cmd+Shift+M (Mac) / Ctrl+Shift+M (Windows)

# Test devices:
- iPhone SE (375 × 667)
- iPhone 13 (390 × 844)
- Pixel 5 (393 × 851)
- iPad Mini (768 × 1024)
```

### Real Devices
- iPhone with iOS 15+
- Android phone with Android 11+

### Testing URLs
- Dev: `http://localhost:5173`
- Staging: `https://staging.erp.lenza.uz`
- Production: `https://erp.lenza.uz`

---

## Sign-Off

- [ ] All critical tests passing
- [ ] No high-priority bugs
- [ ] Performance acceptable
- [ ] Accessibility standards met
- [ ] Dark mode functional
- [ ] Ready for production deployment

**Tester**: ___________________  
**Date**: ___________________  
**Build Version**: ___________________  
**Notes**: ___________________
