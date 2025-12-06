/**
 * Frontend Manual Test Scenarios for Finance Transactions
 * 
 * Bu test ssenariylari Finance → Transactions sahifasini manual test qilish uchun
 */

## TEST SSENARIYLARI

### Scenario 1: USD Kirim Transaction
**Sharti:** Dilerdan USD to'lov qabul qilish
**Kutilayotgan natija:**
- Transaction jadvalda ko'rinadi
- Amount USD formatda: $1,000.00
- UZS equivalent ko'rsatiladi: ≈ 12,500,000.00 UZS
- Status: Draft (sariq badge)
- Diler nomi ko'rinadi

### Scenario 2: UZS Kirim Transaction  
**Sharti:** Dilerdan UZS to'lov qabul qilish
**Kutilayotgan natija:**
- Transaction jadvalda ko'rinadi
- Amount UZS formatda: 5,000,000.00 UZS
- USD equivalent ko'rsatiladi: ≈ $400.00
- Diler nomi to'g'ri chiqadi

### Scenario 3: USD Chiqim Transaction
**Sharti:** Xarajat (ofis buyumlari)
**Kutilayotgan natija:**
- Transaction jadvalda ko'rinadi
- Type badge: Chiqim (qizil)
- Diler: "-" (bo'sh)
- Category: Office supplies
- Amount USD formatda

### Scenario 4: UZS Chiqim Transaction
**Sharti:** Xarajat (ijara haqi)
**Kutilayotgan natija:**
- Type: Chiqim badge
- Amount UZS: 1,250,000.00 UZS
- USD equivalent: ≈ $100.00
- Category: Rent

### Scenario 5: Zero Amount Transaction
**Sharti:** 0.00 summa bilan transaction
**Kutilayotgan natija:**
- Transaction ko'rinadi
- Amount: $0.00 yoki 0.00 UZS
- Converted amount: $0.00 / 0.00 UZS

### Scenario 6: Kichik Summa (1 sent)
**Sharti:** 0.01 USD transaction
**Kutilayotgan natija:**
- Transaction render bo'ladi
- Amount: $0.01
- UZS: ≈ 125.00 UZS

### Scenario 7: Katta Summa
**Sharti:** 999,999.99 USD transaction
**Kutilayotgan natija:**
- Transaction ko'rinadi
- Amount to'g'ri formatlangan: $999,999.99
- UZS juda katta raqam to'g'ri ko'rsatiladi

### Scenario 8: Draft Status
**Sharti:** Draft statusdagi transaction
**Kutilayotgan natija:**
- Status badge: Draft (sariq)
- Approve tugmasi ko'rinadi (yashil checkbox)
- Delete tugmasi ko'rinadi (qizil trash)

### Scenario 9: Approved Status
**Sharti:** Tasdiqlangan transaction
**Kutilayotgan natija:**
- Status badge: Tasdiqlangan (yashil)
- Bekor qilish tugmasi ko'rinadi (to'q sariq X)
- Approved by va approved_at ma'lumoti

### Scenario 10: Cancelled Status
**Sharti:** Bekor qilingan transaction
**Kutilayotgan natija:**
- Status badge: Bekor qilingan (qizil)
- Hech qanday action tugmasi yo'q

### Scenario 11: Filterlar - Type bo'yicha
**Sharti:** Type filterni "Kirim" ga o'zgartirish
**Kutilayotgan natija:**
- Faqat income type transactionlar ko'rinadi
- Expense transactionlar yashiriladi

### Scenario 12: Filterlar - Status bo'yicha
**Sharti:** Status filterni "Draft" ga o'zgartirish
**Kutilayotgan natija:**
- Faqat draft statusdagi transactionlar
- Approved/cancelled yashiriladi

### Scenario 13: Filterlar - Currency bo'yicha
**Sharti:** Currency filterni "USD" ga o'zgartirish
**Kutilayotgan natija:**
- Faqat USD currency transactionlar
- UZS transactionlar yashiriladi

### Scenario 14: Filterlarni Tozalash
**Sharti:** "Tozalash" tugmasini bosish
**Kutilayotgan natija:**
- Barcha filterlar default holatga qaytadi
- Barcha transactionlar ko'rinadi

### Scenario 15: Pagination - Sahifalar
**Sharti:** 60ta transaction mavjud, page_size=50
**Kutilayotgan natija:**
- Pagination controls ko'rinadi
- "Ko'rsatilmoqda 1-50 dan 60 natija"
- "Keyingi" tugmasi active
- Ikkinchi sahifaga o'tganda 51-60 ko'rinadi

### Scenario 16: Pagination - Page Size O'zgartirish
**Sharti:** Page size ni 25 ga o'zgartirish
**Kutilayotgan natija:**
- Jadvalda 25ta row
- Sahifalar soni yangilanadi
- Birinchi sahifaga qaytadi

### Scenario 17: Approve Action
**Sharti:** Draft transactionni approve qilish
**Kutilayotgan natija:**
- Confirm dialog ochiladi
- Tasdiqlangandan keyin status "Approved" ga o'zgaradi
- Badge yashilga o'zgaradi
- Approved by ma'lumoti qo'shiladi

### Scenario 18: Delete Action
**Sharti:** Draft transactionni o'chirish
**Kutilayotgan natija:**
- Confirm dialog ochiladi
- O'chirilgandan keyin jadvaldan yo'qoladi
- Transaction count kamayadi

### Scenario 19: Cancel Action  
**Sharti:** Approved transactionni cancel qilish
**Kutilayotgan natija:**
- Confirm dialog
- Status "Cancelled" ga o'zgaradi
- Badge qizilga o'zgaradi

### Scenario 20: Loading State
**Sharti:** Sahifa yangi yuklanganda
**Kutilayotgan natija:**
- Spinner animatsiyasi ko'rinadi
- "Loading..." matni chiqadi
- Ma'lumotlar yuklanishi kutiladi

### Scenario 21: Error State
**Sharti:** API xatosi (network yoki 500 error)
**Kutilayotgan natija:**
- Qizil error box ko'rinadi
- Error message chiqadi
- "Retry" tugmasi mavjud

### Scenario 22: Empty State
**Sharti:** Hech qanday transaction yo'q
**Kutilayotgan natija:**
- Bo'sh jadval
- "Operatsiyalar topilmadi" matni
- Filter controllar ishlaydi

### Scenario 23: Card Account Transaction
**Sharti:** Card account orqali to'lov
**Kutilayotgan natija:**
- Account name: "Card USD"
- Transaction normal render bo'ladi

### Scenario 24: Bank Account Transaction
**Sharti:** Bank account orqali to'lov
**Kutilayotgan natija:**
- Account name: "Bank UZS"
- To'g'ri ko'rinadi

### Scenario 25: Comment Bilan Transaction
**Sharti:** Transaction commentga ega
**Kutilayotgan natija:**
- Tooltip yoki expand qilinganda comment ko'rinadi
- (Hozirda UI'da comment column yo'q, lekin data mavjud)

## UI KO'RINISHI

```
╔════════════════════════════════════════════════════════════════════════════════╗
║                         MOLIYA OPERATSIYALARI                                   ║
║                      Kirim va chiqim operatsiyalari                            ║
╠════════════════════════════════════════════════════════════════════════════════╣
║  [Turi ▼]  [Status ▼]  [Valyuta ▼]  [Tozalash]                               ║
╠════════════════════════════════════════════════════════════════════════════════╣
║ ID │ Sana       │ Turi   │ Diler      │ Summa          │ Kategoriya │ Status │
╠════════════════════════════════════════════════════════════════════════════════╣
║ #1 │ 06.12.2025 │ Kirim  │ Dealer 1   │ $1,000.00      │ -          │ Draft  │
║    │            │ 🟢     │            │ ≈ 12,500,000   │            │ 🟡     │
╠────────────────────────────────────────────────────────────────────────────────╣
║ #2 │ 06.12.2025 │ Chiqim │ -          │ 5,000,000 UZS  │ Rent       │ ✅     │
║    │            │ 🔴     │            │ ≈ $400.00      │            │ 🟢     │
╠────────────────────────────────────────────────────────────────────────────────╣
║ #3 │ 05.12.2025 │ Kirim  │ Dealer 2   │ $250.00        │ -          │ ❌     │
║    │            │ 🟢     │            │                 │            │ 🔴     │
╚════════════════════════════════════════════════════════════════════════════════╝
   Ko'rsatilmoqda 1-50 dan 150 natija    [◀ Oldingi] Sahifa 1/3 [Keyingi ▶]
```

## EXPECTED RESULTS

Barcha 25 test ssenariylari o'tishi kerak. Har bir transaction:
✅ Jadvalda ko'rinishi
✅ To'g'ri amount formatlanishi  
✅ Currency conversion ko'rsatilishi
✅ Status badge to'g'ri rangi
✅ Action tugmalari status bo'yicha
✅ Filterlar ishlashi
✅ Pagination to'g'ri ishlashi
✅ Loading va error holatlari handle qilinishi
