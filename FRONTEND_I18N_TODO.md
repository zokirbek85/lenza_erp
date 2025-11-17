# 🚀 LENZA ERP - I18N Integratsiya - Bajarish Rejasi

## ✅ TAYYOR BO'LGAN NARSALAR

1. ✅ i18next va react-i18next o'rnatilgan
2. ✅ i18n/index.ts konfiguratsiya fayli mavjud
3. ✅ LanguageSwitcher komponenti mavjud va ishlayapti
4. ✅ Sidebar komponentida menu items tarjimalangan
5. ✅ Orders sahifasida qisman i18n ishlatilmoqda
6. ✅ Payments sahifasida qisman i18n ishlatilmoqda
7. ✅ TwoFactor sahifasida to'liq i18n
8. ✅ ManualsPage sahifasida to'liq i18n

## 🎯 BAJARILISHI KERAK ISHLAR

### BOSQICH 1: Translation Fayllarini Kengaytirish ✅

**Fayl:** `src/i18n/locales/uz/translation.json`

Quyidagi keylarni qo'shish kerak:

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
    "importProducts": "Import qilish",
    "importing": "Import qilinmoqda...",
    "selectFile": "Fayl tanlang",
    "adjustStock": "Zaxirani tuzatish",
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
      "allBrands": "Barcha brendlar",
      "allCategories": "Barcha kategoriyalar"
    }
  },
  "dealers": {
    "title": "Dilerlar",
    "subtitle": "Dilerlar ro'yxati va balanslar",
    "newDealer": "Yangi diler",
    "editDealer": "Dilerni tahrirlash",
    "noDealers": "Dilerlar topilmadi",
    "dealerCreated": "Diler yaratildi",
    "dealerUpdated": "Diler yangilandi",
    "dealerDeleted": "Diler o'chirildi",
    "viewDetails": "Batafsil ko'rish",
    "ordersHistory": "Buyurtmalar tarixi",
    "paymentsHistory": "To'lovlar tarixi",
    "table": {
      "name": "Nomi",
      "code": "Kod",
      "contact": "Kontakt",
      "region": "Hudud",
      "manager": "Menejer",
      "balance": "Balans",
      "actions": "Amallar"
    },
    "form": {
      "namePlaceholder": "Diler nomini kiriting",
      "codePlaceholder": "Diler kodini kiriting",
      "contactPlaceholder": "Telefon raqami",
      "selectRegion": "Hududni tanlang",
      "selectManager": "Menejerni tanlang",
      "openingBalance": "Boshlang'ich balans (USD)"
    },
    "filters": {
      "region": "Hudud",
      "allRegions": "Barcha hududlar"
    }
  },
  "users": {
    "title": "Foydalanuvchilar",
    "subtitle": "Foydalanuvchilarni boshqarish",
    "newUser": "Yangi foydalanuvchi",
    "editUser": "Foydalanuvchini tahrirlash",
    "noUsers": "Foydalanuvchilar topilmadi",
    "userCreated": "Foydalanuvchi yaratildi",
    "userUpdated": "Foydalanuvchi yangilandi",
    "deactivate": "Deaktivatsiya",
    "activate": "Aktivatsiya",
    "resetPassword": "Parolni tiklash",
    "table": {
      "username": "Login",
      "fullName": "To'liq ismi",
      "email": "Email",
      "role": "Rol",
      "status": "Holat",
      "actions": "Amallar"
    },
    "form": {
      "usernamePlaceholder": "Login kiriting",
      "firstNamePlaceholder": "Ism kiriting",
      "lastNamePlaceholder": "Familiya kiriting",
      "emailPlaceholder": "Email kiriting",
      "selectRole": "Rolni tanlang",
      "passwordPlaceholder": "Parol kiriting"
    },
    "roles": {
      "admin": "Administrator",
      "owner": "Egasi",
      "accountant": "Buxgalter",
      "sales": "Sotuv menejeri",
      "warehouse": "Omborchi"
    },
    "filters": {
      "role": "Rol",
      "allRoles": "Barcha rollar"
    }
  },
  "regions": {
    "title": "Hududlar",
    "subtitle": "Hududlarni boshqarish",
    "newRegion": "Yangi hudud",
    "editRegion": "Hududni tahrirlash",
    "noRegions": "Hududlar topilmadi",
    "regionCreated": "Hudud yaratildi",
    "regionUpdated": "Hudud yangilandi",
    "regionDeleted": "Hudud o'chirildi",
    "deleteConfirm": "Ushbu hududni o'chirishni tasdiqlaysizmi?",
    "table": {
      "name": "Nomi",
      "manager": "Menejer",
      "actions": "Amallar"
    },
    "form": {
      "namePlaceholder": "Hudud nomini kiriting",
      "selectManager": "Menejerni tanlang"
    }
  },
  "currency": {
    "title": "Valyuta kurslari",
    "subtitle": "USD/UZS kurslari tarixi",
    "newRate": "Yangi kurs",
    "currentRate": "Joriy kurs",
    "rateCreated": "Kurs yaratildi",
    "table": {
      "date": "Sana",
      "rate": "USD → UZS",
      "actions": "Amallar"
    },
    "form": {
      "selectDate": "Sanani tanlang",
      "ratePlaceholder": "Kursni kiriting"
    }
  },
  "returns": {
    "title": "Qaytishlar",
    "subtitle": "Qaytarilgan mahsulotlar ro'yxati",
    "newReturn": "Yangi qaytish",
    "good": "Yaxshi",
    "defective": "Nuqsonli",
    "noReturns": "Qaytishlar topilmadi",
    "returnCreated": "Qaytish yaratildi",
    "statistics": "Qaytishlar statistikasi",
    "table": {
      "order": "Buyurtma",
      "product": "Mahsulot",
      "quantity": "Miqdor",
      "condition": "Holat",
      "reason": "Sabab",
      "date": "Sana"
    }
  },
  "reconciliation": {
    "title": "Akt sverka",
    "subtitle": "Diler bilan hisob-kitob akti",
    "selectDealer": "Dilerni tanlang",
    "period": "Davr",
    "from": "Dan",
    "to": "Gacha",
    "generate": "Yaratish",
    "loading": "Yuklanmoqda...",
    "openingBalance": "Boshlang'ich balans",
    "closingBalance": "Yakuniy balans",
    "detailed": "Batafsil",
    "preview": "Ko'rib chiqish",
    "noData": "Tanlangan davr uchun ma'lumot topilmadi",
    "table": {
      "date": "Sana",
      "description": "Tavsif",
      "debit": "Debet",
      "credit": "Kredit"
    }
  },
  "settings": {
    "title": "Sozlamalar",
    "subtitle": "Tizim sozlamalari",
    "company": "Kompaniya ma'lumotlari",
    "telegram": "Telegram integratsiyasi",
    "cards": "To'lov kartalari",
    "settingsSaved": "Sozlamalar saqlandi",
    "form": {
      "companyNamePlaceholder": "Kompaniya nomini kiriting",
      "telegramTokenPlaceholder": "Bot tokenini kiriting",
      "cardNamePlaceholder": "Karta nomini kiriting"
    }
  },
  "kpi": {
    "owner": {
      "title": "Egalik paneli",
      "totalSales": "Savdo (USD)",
      "totalPayments": "To'lovlar",
      "dealersCount": "Dilerlar soni",
      "topDealers": "Top dilerlar",
      "balances": "Balanslar",
      "noData": "Ma'lumot topilmadi"
    },
    "manager": {
      "title": "Sotuv menejeri paneli",
      "mySales": "Mening savdolarim (USD)",
      "myPayments": "Mening qabul qilingan to'lovlarim",
      "myDealers": "Mening dilerlar sonim",
      "myTopDealers": "Mening top dilerlarim"
    },
    "warehouse": {
      "title": "Ombor paneli",
      "lowStock": "Past zaxiralar",
      "defectStock": "Aktiv defekt partiyalar",
      "items": "dona"
    },
    "common": {
      "loading": "KPI ma'lumotlari yuklanmoqda...",
      "error": "KPI ma'lumotlarini yuklab bo'lmadi"
    }
  },
  "common": {
    "yes": "Ha",
    "no": "Yo'q",
    "ok": "OK",
    "loading": "Yuklanmoqda...",
    "saving": "Saqlanmoqda...",
    "error": "Xatolik",
    "success": "Muvaffaqiyatli",
    "noData": "Ma'lumot yo'q",
    "total": "Jami",
    "from": "Dan",
    "to": "Gacha",
    "date": "Sana",
    "status": "Holat",
    "name": "Nomi",
    "code": "Kod",
    "description": "Tavsif",
    "note": "Izoh",
    "amount": "Summa",
    "actions": "Amallar",
    "active": "Faol",
    "inactive": "Nofaol",
    "search": "Qidirish",
    "filter": "Filtrlash",
    "refresh": "Yangilash",
    "edit": "Tahrirlash",
    "delete": "O'chirish"
  },
  "pagination": {
    "show": "Ko'rsat:",
    "perPage": "ta yozuv / sahifa",
    "showing": "Ko'rsatilmoqda",
    "page": "Sahifa",
    "previous": "← Oldingi",
    "next": "Keyingi →"
  },
  "order": {
    "title": "Buyurtmalar",
    "subtitle": "Statusni kuzatish va eksport",
    "newOrder": "Yangi buyurtma yaratish",
    "hideForm": "Formani yashirish",
    "showForm": "Formani ko'rsatish",
    "noOrders": "Buyurtmalar topilmadi",
    "clearDraft": "Draftni tozalash",
    "selectedProducts": "Tanlangan mahsulotlar",
    "emptyCart": "Tanlangan mahsulotlar ro'yxati bo'sh",
    "table": {
      "id": "ID",
      "number": "Raqam",
      "dealer": "Diller",
      "date": "Sana",
      "total": "Jami",
      "status": "Status",
      "actions": "Amallar"
    },
    "product": {
      "sku": "SKU",
      "name": "Nomi",
      "price": "Narx",
      "quantity": "Miqdor",
      "subtotal": "Oraliq jami",
      "selectProduct": "Mahsulot tanlang"
    }
  }
}
```

---

### BOSQICH 2: Asosiy Sahifalarni Yangilash

**Priority 1 - Eng Muhim Sahifalar:**

#### 1. Products.tsx
- [ ] Import `useTranslation`
- [ ] Replace hardcoded page title/subtitle
- [ ] Replace table headers
- [ ] Replace button labels
- [ ] Replace form labels/placeholders
- [ ] Replace filter labels
- [ ] Replace notifications/toasts
- [ ] Replace modals

#### 2. Dealers.tsx  
- [ ] Import `useTranslation`
- [ ] Replace hardcoded titles
- [ ] Replace table headers
- [ ] Replace form fields
- [ ] Replace buttons
- [ ] Replace notifications

#### 3. Users.tsx
- [ ] Import `useTranslation`
- [ ] Replace page title
- [ ] Replace table columns
- [ ] Replace role labels
- [ ] Replace status labels
- [ ] Replace action buttons

#### 4. Regions.tsx
- [ ] Import `useTranslation`
- [ ] Replace titles
- [ ] Replace table headers
- [ ] Replace form labels
- [ ] Replace buttons

#### 5. Expenses.tsx
- [ ] Import `useTranslation`
- [ ] Replace titles
- [ ] Replace filters
- [ ] Replace table columns
- [ ] Replace form labels
- [ ] Replace chart titles

#### 6. ExpenseReport.tsx
- [ ] Import `useTranslation`
- [ ] Replace title/subtitle
- [ ] Replace table headers
- [ ] Replace chart labels
- [ ] Replace export file names

#### 7. ExpenseTypes.tsx
- [ ] Import `useTranslation`
- [ ] Replace titles
- [ ] Replace table columns
- [ ] Replace form labels
- [ ] Replace modals

#### 8. Ledger.tsx
- [ ] Already using i18n (partially)
- [ ] Complete remaining hardcoded texts

#### 9. CurrencyRates.tsx
- [ ] Import `useTranslation`
- [ ] Replace title
- [ ] Replace table headers
- [ ] Replace form labels

#### 10. ReturnsPage.tsx
- [ ] Import `useTranslation`
- [ ] Replace title
- [ ] Replace table columns
- [ ] Replace form labels
- [ ] Replace chart labels

#### 11. ReconciliationPage.tsx
- [ ] Import `useTranslation`
- [ ] Replace title/subtitle
- [ ] Replace form labels
- [ ] Replace table headers
- [ ] Replace buttons

#### 12. SettingsPage.tsx
- [ ] Import `useTranslation`
- [ ] Replace section titles
- [ ] Replace form labels
- [ ] Replace notifications

#### 13. KPI Pages:
- [ ] OwnerKpiPage.tsx - card titles, chart labels
- [ ] ManagerKpiPage.tsx - card titles, chart labels
- [ ] WarehouseKpiPage.tsx - section titles

#### 14. NotificationCenter.tsx
- [ ] Replace title
- [ ] Replace filter labels
- [ ] Replace action buttons

---

### BOSQICH 3: Komponentlarni Yangilash

#### Components:
- [ ] PaginationControls.tsx (partial - needs completion)
- [ ] Modal.tsx
- [ ] OrderFilters.tsx
- [ ] DebtByDealerChart.tsx
- [ ] DebtTrendChart.tsx
- [ ] LedgerBalanceWidget.tsx
- [ ] KpiCard.tsx
- [ ] OrderItemTable.tsx
- [ ] ProductsMobileCards.tsx
- [ ] OrdersMobileCards.tsx

---

### BOSQICH 4: Rus va Ingliz Tillarini Qo'shish

Translation keylar o'zbek tilida tugagandan keyin, ru va en fayllarini to'ldirish:

- [ ] `src/i18n/locales/ru/translation.json`
- [ ] `src/i18n/locales/en/translation.json`

---

### BOSQICH 5: Testing

1. **Visual Testing:**
   - [ ] Har bir sahifani 3 tilda ochish (uz, ru, en)
   - [ ] Barcha matnlar ko'rinishini tekshirish
   - [ ] Layout buzilmasligini tekshirish

2. **Console Testing:**
   - [ ] Browser console-da missing key xatolari yo'qligini tekshirish
   - [ ] Network tab-da translation fayllar to'g'ri yuklanishini ko'rish

3. **Functional Testing:**
   - [ ] Til almashtirganda sahifa yangilanishini tekshirish
   - [ ] Dynamic content (interpolation) to'g'ri ishlashini tekshirish
   - [ ] PDF/Excel export file name tarjimalarini tekshirish

---

### BOSQICH 6: Documentation

- [x] Create `FRONTEND_I18N_COMPLETE_GUIDE.md` ✅
- [ ] Update README.md with i18n section
- [ ] Create migration guide for future developers

---

### BOSQICH 7: Commit

```bash
git add .
git commit -m "feat(i18n): add complete internationalization support

- Add comprehensive translation keys for all modules
- Migrate all pages to use i18n (Products, Dealers, Users, Orders, etc.)
- Add translations for tables, forms, buttons, notifications
- Support 3 languages: Uzbek (uz), Russian (ru), English (en)
- Add formatters for currency and date localization
- Update all components to use translation keys
- Add complete user manual in all languages

BREAKING CHANGE: All hardcoded texts replaced with translation keys
"
```

---

## 📊 Progress Tracker

### Pages (15/16):
- [x] Orders.tsx (partial)
- [x] Payments.tsx (partial)
- [x] TwoFactor.tsx ✅
- [x] ManualsPage.tsx ✅
- [x] Ledger.tsx (partial)
- [ ] Products.tsx
- [ ] Dealers.tsx
- [ ] Users.tsx
- [ ] Regions.tsx
- [ ] Expenses.tsx
- [ ] ExpenseReport.tsx
- [ ] ExpenseTypes.tsx
- [ ] CurrencyRates.tsx
- [ ] ReturnsPage.tsx
- [ ] ReconciliationPage.tsx
- [ ] SettingsPage.tsx
- [ ] KPI Pages (3 pages)
- [ ] NotificationCenter.tsx

### Components (2/10):
- [x] Sidebar.tsx ✅
- [x] LanguageSwitcher.tsx ✅
- [ ] PaginationControls.tsx (partial)
- [ ] Modal.tsx
- [ ] OrderFilters.tsx
- [ ] Charts
- [ ] KPI Components
- [ ] Mobile Components

### Translation Files (1/3):
- [x] uz/translation.json (partial - needs expansion)
- [ ] ru/translation.json
- [ ] en/translation.json

---

## 🎯 Next Steps

1. **Hozir:** Translation keylarni to'liq qo'shish (uz)
2. **Keyin:** Products.tsx sahifasini pattern sifatida to'liq yangilash
3. **So'ngra:** Boshqa sahifalarni ketma-ket yangilash
4. **Oxirida:** Rus va Ingliz tillarini qo'shish

---

## 📝 Notes

- Barcha hardcoded matnlar **tarjima qilinishi kerak**
- **Consistency** - bir xil pattern bo'yicha
- **Reusability** - common keylardan foydalanish
- **Testing** - har bir o'zgarishdan keyin test qilish
- **Documentation** - yangi keylar uchun izoh qoldirish

---

**Status:** 🟡 In Progress  
**Last Updated:** 2025-01-XX  
**Next Milestone:** Products.tsx migration
