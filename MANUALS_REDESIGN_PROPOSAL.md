# LENZA ERP — INTERAKTIV QO'LLANMA QAYTA LOYIHALASH

> **Maqsad**: Lenza ERP'ni yangi xodim 1 kun ichida, eski xodim esa manualga qaramasdan ishlata oladigan darajaga olib chiqish.

---

## I. TAHLIL BOSQICHI — TIZIMNING TO'LIQ AUDITI

### 1.1. MODULLAR VA ULARNIN

G MAQSADI

#### **Dashboard (Boshqaruv paneli)**
- **Nima uchun kerak**: Biznesning hozirgi holatini bir nazar bilan ko'rish
- **Kim ishlatadi**: Admin, Direktor (Owner), Moliyachi
- **Asosiy biznes oqim**:
  1. Tizimga kirish
  2. KPI kartochkalarini ko'rish (savdo, qarz, inventar)
  3. Kritik vaziyatlarni aniqlash (qarz osganlar, kam qolgan mahsulotlar)
  4. Tezkor qaror qabul qilish
- **Xatolar**:
  - Ma'lumotlar yuklanmasa — backend bilan aloqa uzilgan
  - Kartochkalar bo'sh — davr noto'g'ri tanlangan yoki ma'lumot yo'q
- **Xavfli ishlatish**:
  - ❌ Kartochkalarni drag&drop qilib saqlashni unutish — keyingi safar tartib buzilib qoladi
  - ❌ KPI'larni tushunmay qaror qabul qilish

#### **Orders (Buyurtmalar)**
- **Nima uchun kerak**: Diller buyurtmalarini yaratish, kuzatish va yetkazib berish
- **Kim ishlatadi**: Admin, Sotuv menejeri (yaratish), Omborchi (bajarish), Moliyachi (nazorat)
- **Asosiy biznes oqim**:
  1. **Sotuv**: Dillerdan buyurtma qabul qilish → Tizimda Order yaratish → Mahsulot qo'shish → Chegirma berish (agar kerak bo'lsa)
  2. **Admin**: Buyurtmani tasdiqlash (CONFIRMED) → Valyuta kursini kiritish
  3. **Omborchi**: Mahsulotlarni yig'ish (PACKED) → Yuborish (SHIPPED) → Yetkazildi (DELIVERED)
  4. **Qaytish**: Agar qaytsa — RETURNED statusga o'tkazish
- **Xatolar**:
  - Omborda mahsulot yetarli emas → Sistema ogohlantiradi
  - Valyuta kursi kiritilmagan → Hisob-kitob noto'g'ri
  - Status noto'g'ri o'zgartirilsa → Jarayon buziladi
- **Xavfli ishlatish**:
  - ⚠️ **Omborchi faqat ketma-ket status o'zgartira oladi** (CONFIRMED → PACKED → SHIPPED). Sakrab o'tkazsa xato.
  - ❌ Chegirmani noto'g'ri kiritish — moliyaviy yo'qotish
  - ❌ Tasdiqlangan orderni o'chirish — qarzlar noto'g'ri hisoblanadi
  - ✅ **To'g'ri**: Order CREATED statusda bo'lsa — tahrirlash mumkin. CONFIRMED bo'lgandan keyin — faqat Admin o'zgartira oladi.

#### **Dealers (Dillerlar)**
- **Nima uchun kerak**: Mijozlarni boshqarish, balanslarini kuzatish
- **Kim ishlatadi**: Admin, Sotuv menejeri, Moliyachi
- **Asosiy biznes oqim**:
  1. Yangi diller qo'shish (ismi, kodi, viloyat, manager)
  2. Opening balance kiritish (agar oldindan qarzi bo'lsa)
  3. Orderlar tuzilganda qarz avtomatik oshadi
  4. To'lovlar tushganda qarz kamayadi
  5. Sverka (reconciliation) — oylik hisob-kitob
- **Xatolar**:
  - Bir xil kod bilan ikkita diller kiritish mumkin emas
  - Opening balance noto'g'ri kiritilsa — butun hisob buzilib qoladi
  - Viloyatni noto'g'ri tanlash — statistika noto'g'ri
- **Xavfli ishlatish**:
  - ❌ **Opening balance bir marta kiritiladi!** Keyin o'zgartirish uchun admin ruxsati kerak.
  - ❌ Dillarni o'chirish — orderlar "yetim" qoladi, qarzlar yo'qoladi
  - ⚠️ Manager o'zgartirilsa —eski manager KPI'si pasayadi
  - ✅ **To'g'ri**: Diller yaratilgandan so'ng uning balansini darhol tekshiring (Balance ustuni)

#### **Warehouse / Stock (Ombor / Inventar)**
- **Nima uchun kerak**: Mahsulotlar zaxirasini kuzatish va inventarizatsiya
- **Kim ishlatadi**: Admin, Omborchi, Moliyachi
- **Asosiy biznes oqim**:
  1. Mahsulot kelganda stokka qo'shish
  2. Order bajarilganda avtomatik ayriladi
  3. Oylik inventarizatsiya (jismoniy sanoq)
  4. Excel yuklash → Sistema taqqoslaydi → Farqni ko'rsatadi
  5. Defekt mahsulotlarni alohida kuzatish
- **Xatolar**:
  - Excel format noto'g'ri — import ishlamaydi
  - Mahsulot SKU noto'g'ri — boshqa mahsulot stoki o'zgaradi
  - Jismoniy sanoqda xato — farq ortiqcha chiqadi
- **Xavfli ishlatish**:
  - ❌ Inventarizatsiya natijasini tasdiqlashdan oldin ikki marta tekshiring — bir marta tasdiqlasangiz qaytarib bo'lmaydi
  - ⚠️ Defekt mahsulotni "OK" stokka qo'shish — sifatsiz mahsulot sotiladi
  - ⚠️ Stokni qo'lda o'zgartirish faqat Admin orqali mumkin
  - ✅ **To'g'ri**: Inventarizatsiyadan oldin barcha orderlarni bajarib bo'ling

#### **Defects (Defektlar) — YANGI MODUL**
- **Nima uchun kerak**: Nuqsonli mahsulotlarni boshqarish, sabab va harakatlarni kuzatish
- **Kim ishlatadi**: Admin, Omborchi, Moliyachi
- **Asosiy biznes oqim**:
  1. Defekt topiladi (qabul qilishda, omborda, dillerdan qaytishda)
  2. Defekt ma'lumotini kiritish: mahsulot, miqdor, sabab (ishlab chiqarish, transport, saqlash), rasm
  3. Qaror qabul qilish: Ta'mirlash / Utilizatsiya / Yetkazuvchiga qaytarish
  4. Harakat bajarish va statusni yangilash
  5. Moliyaviy yo'qotishni hisoblash
- **Xatolar**:
  - Mahsulot noto'g'ri tanlangan — statistika buziladi
  - Sabab tanlanmagan — tahlil qilish qiyin
  - Rasm yuklanmagan — keyin isbotlash qiyin
- **Xavfli ishlatish**:
  - ❌ Defektni "OK" stokka qaytarish — sifatsiz mahsulot sotiladi
  - ⚠️ Defekt yaratilgandan keyin o'chirish mumkin emas, faqat statusini yangilash mumkin
  - ✅ **To'g'ri**: Har bir defekt uchun rasm yuklang va sabab yozing

#### **Returns (Qaytishlar)**
- **Nima uchun kerak**: Diller qaytargan mahsulotlarni ro'yxatga olish
- **Kim ishlatadi**: Admin, Sotuv menejeri, Omborchi, Moliyachi
- **Asosiy biznes oqim**:
  1. Diller mahsulot qaytaradi
  2. Omborchi qabul qiladi va tizimga kiritadi
  3. Har bir mahsulot uchun holat tanlanadi: Sog'lom (Healthy) yoki Defekt
  4. Sog'lom mahsulot "OK" stokka, defekt "Defect" stokka o'tadi
  5. Diller qarzi kamayadi
- **Xatolar**:
  - Mahsulot holatini noto'g'ri tanlash — stok buzilib qoladi
  - Return yaratib dillarni tanlamagan — qarz o'zgarmaydi
- **Xavfli ishlatish**:
  - ❌ Defekt mahsulotni "Healthy" deb belgilash — keyinchalik sotib xaridor norozi bo'ladi
  - ⚠️ Return tasdiqlangandan keyin o'chirib bo'lmaydi
  - ✅ **To'g'ri**: Qabul qilayotganda mahsulotni diqqat bilan tekshiring va to'g'ri holat tanlang

#### **Finance (Moliya)**
- **Nima uchun kerak**: Pul oqimini kuzatish, to'lovlar, xarajatlar, valyuta konvertatsiyasi
- **Kim ishlatadi**: Admin, Moliyachi, Direktor (ko'rish)
- **Asosiy biznes oqim**:
  1. **Hisoblar yaratish**: Naqd, Karta, Bank (USD va UZS)
  2. **Kirim**: Diller to'lovi → Hisobga tushirish → Diller qarzi kamayadi
  3. **Chiqim**: Xarajat (ish haqi, transport, arenda) → Kategoriya tanlash → Tasdiqlash
  4. **Valyuta konvertatsiyasi**: USD → UZS yoki aksincha
  5. **Diller refund**: Diller ortiqcha to'lagan bo'lsa qaytarish
- **Xatolar**:
  - Valyuta kursi kiritilmagan — konvertatsiya ishlamaydi
  - Noto'g'ri hisob tanlangan — pul "yo'qoladi"
  - Kategoriya tanlanmagan — hisobot chiqarib bo'lmaydi
- **Xavfli ishlatish**:
  - ❌ **Tasdiqlangan (Approved) transaksiyani o'chirish mumkin emas** — faqat bekor qilish (Cancel)
  - ❌ Valyuta kursini noto'g'ri kiritish — moliyaviy yo'qotish
  - ⚠️ Bir hisobdan ikkinchisiga o'tkazishda ikki marta yozmaslik (avtomatik ikkala tomonga yoziladi)
  - ⚠️ Opening balance faqat bir marta kiritiladi
  - ✅ **To'g'ri**: Har kuni valyuta kursini yangilang (Settings → Exchange Rates)

#### **KPI (Ko'rsatkichlar)**
- **Nima uchun kerak**: Har bir rol uchun asosiy ko'rsatkichlarni kuzatish
- **Kim ishlatadi**: Barcha rollar (o'z rollariga qarab)
- **Rollar bo'yicha KPI**:
  - **Owner/Direktor**: Umumiy savdo, qarzlar, TOP dillerlar, o'rtacha chek
  - **Sotuv menejeri**: Shaxsiy savdo, viloyat bo'yicha natija, KPI reytingi
  - **Omborchi**: Inventar holati, bajarilgan orderlar, defektlar foizi
  - **Moliyachi**: Tushumlar, to'lovlar, xarajatlar, cash flow
- **Xatolar**:
  - Davr noto'g'ri tanlangan — ma'lumot chiqmaydi
  - Filtrlar noto'g'ri — natija chalkashtiradi
- **Xavfli ishlatish**:
  - ❌ KPI'ni tushunmay qaror qabul qilish
  - ⚠️ Leaderboard faqat direktor ko'radi — maxfiy ma'lumot
  - ✅ **To'g'ri**: Har hafta KPI'ni tahlil qiling va trend kuzating

#### **Import / Export**
- **Nima uchun kerak**: Ommaviy ma'lumot yuklash va hisobot chiqarish
- **Kim ishlatadi**: Admin, Moliyachi
- **Qo'llab-quvvatlanadigan formatlar**:
  - **Import**: Excel (Products, Orders, Dealers, Inventory)
  - **Export**: Excel, PDF (barcha modullar uchun)
- **Xatolar**:
  - Excel shablon noto'g'ri — import xato beradi
  - Majburiy maydonlar bo'sh — import to'xtaydi
  - Dublikat ma'lumot — xato yoki rad etadi
- **Xavfli ishlatish**:
  - ❌ **Inventory import tasdiqlashdan oldin preview ko'ring** — noto'g'ri import butun stokni buzadi
  - ❌ Opening balance import qilishda ehtiyot bo'ling — qarzlar buzilib qoladi
  - ✅ **To'g'ri**: Har doim avval templateni yuklab oling va to'ldiring

#### **Users & Roles (Foydalanuvchilar va rollar)**
- **Nima uchun kerak**: Xodimlarni tizimga qo'shish va ruxsatlarni boshqarish
- **Kim ishlatadi**: Faqat Admin
- **Rollar**:
  1. **Admin**: Hamma narsa (foydalanuvchilar, sozlamalar, barcha modullar)
  2. **Owner/Direktor**: Moliya, KPI, hisobotlar (faqat ko'rish)
  3. **Accountant/Moliyachi**: Moliya, to'lovlar, xarajatlar, qarzlar
  4. **Sales/Sotuv menejeri**: Orderlar, dillerlar, mahsulotlar (faqat o'ziniki)
  5. **Warehouse/Omborchi**: Orderlarni bajarish, inventar, qaytishlar
- **Xatolar**:
  - Noto'g'ri rol berilgan — xodim keraksiz ma'lumot ko'radi yoki kerakli ishni qila olmaydi
  - Parol zaif — xavfsizlik xavfi
- **Xavfli ishlatish**:
  - ❌ Bir xil parol barcha xodimlarga — xavfsizlik yo'q
  - ❌ Ketgan xodimni o'chirmasdan qoldirish — tizimga kirishi mumkin
  - ⚠️ Admin rolini hammaga bermaslik — tizim buzilishi mumkin
  - ✅ **To'g'ri**: Har bir xodimga faqat kerakli rol bering va parolni majburiy ravishda o'zgartirtiring

#### **Settings (Sozlamalar)**
- **Nima uchun kerak**: Tizimni sozlash va konfiguratsiya
- **Kim ishlatadi**: Admin, Direktor (ba'zi qismlar)
- **Asosiy sozlamalar**:
  - Kompaniya ma'lumotlari (nomi, logo, bank rekvizitlari)
  - Valyuta kurslari
  - Xarajat kategoriyalari
  - Moliya hisoblar
  - Telegram bot integratsiyasi
- **Xatolar**:
  - Logo noto'g'ri formatda — yuklanmaydi
  - Bank rekvizitlari noto'g'ri — PDF'larda xato chiqadi
- **Xavfli ishlatish**:
  - ❌ Kompaniya nomini o'zgartirish — barcha hujjatlarda o'zgaradi
  - ⚠️ Valyuta kursini noto'g'ri kiritish — barcha hisob-kitoblar buziladi
  - ✅ **To'g'ri**: Sozlamalarni o'zgartirishdan oldin nusxa oling (backup)

---

### 1.2. XATOLAR VA NOTO'G'RI ISHLATISH XOLATLARI

#### **KRITIK XATOLAR** (Tizimni buzadi)

| Xato | Qayerda | Oqibat | Qanday oldini olish |
|------|---------|--------|---------------------|
| Opening balance noto'g'ri kiritish | Dealers, Finance | Barcha qarzlar noto'g'ri hisoblanadi | Diller yaratilgandan keyin darhol balansni tekshiring |
| Valyuta kursini kiritmaslik | Orders, Finance | USD/UZS konvertatsiya ishlamaydi | Har kuni kursni yangilang (Settings) |
| Inventarizatsiyani noto'g'ri tasdiqlash | Inventory | Stok butunlay buzilib qoladi | Tasdiqlashdan oldin preview ko'ring va ikki marta tekshiring |
| Tasdiqlangan orderni o'chirish | Orders | Qarzlar, to'lovlar noto'g'ri | CREATED statusdagini o'chiring, qolganlarini Cancel qiling |
| Admin rolini hammaga berish | Users | Xavfsizlik xavfi, ma'lumot yo'qolishi | Faqat ishonchli xodimlarga Admin bering |
| Defekt mahsulotni OK stokka qo'shish | Returns, Defects | Sifatsiz mahsulot sotiladi, shikoyatlar | Mahsulotni qabul qilishda diqqat bilan tekshiring |

#### **TIZIM XATOLARI** (Texnik)

| Xato xabari | Sabab | Yechim |
|-------------|-------|--------|
| "500 Internal Server Error" | Backend ishlamayapti | Adminni chaqiring, server tekshirilsin |
| "401 Unauthorized" | Sessiya tugagan | Qayta login qiling |
| "Network Error" | Internet yo'q | Internetni tekshiring |
| "Insufficient stock" | Omborda mahsulot yetarli emas | Stokni to'ldiring yoki orderga kam qo'shing |
| "Duplicate entry" | Bir xil kod/nomi bilan ma'lumot mavjud | Boshqa kod/nom kiriting |
| "Invalid file format" | Excel/rasm formati noto'g'ri | To'g'ri formatda yuklang (XLSX, PNG, JPG) |

#### **FOYDALANUVCHI XATOLARI** (Ko'p uchraydigan)

1. **Order yaratishda**:
   - ❌ Dillerni tanlamagan — order kimsiz qoladi
   - ❌ Mahsulot miqdori nol — bo'sh order
   - ❌ Chegirmani noto'g'ri kiritish (masalan, 150%) — manfiy summa
   - ✅ **To'g'ri**: Diller → Mahsulot → Miqdor → Chegirma (agar kerak) → Save

2. **To'lov kiritishda**:
   - ❌ Noto'g'ri hisob tanlangan — pul "yo'qoladi"
   - ❌ Summani noto'g'ri kiritish — diller qarzi noto'g'ri
   - ❌ Dillerni tanlamagan — to'lov "osilib" qoladi
   - ✅ **To'g'ri**: Hisob → Diller → Summa → Kategoriya → Save

3. **Mahsulot qo'shishda**:
   - ❌ SKU dublikat — xato
   - ❌ Narxni kiritmaslik — mahsulot "bepul" chiqadi
   - ❌ Kategoriyani tanlamaslik — statistika buziladi
   - ✅ **To'g'ri**: SKU (unique) → Nomi → Kategoriya → Narx (cost va sell) → Stok

---

## II. MANUALS STRUKTURASINI QAYTA LOYIHALASH

### 2.1. YANGI ARXITEKTURA

Hozirgi holat:
```
Manuals sahifasi
├── Getting Started
├── Concepts
├── Admin
├── Director
├── Accountant
├── Sales
├── Warehouse
└── FAQ
```

**MUAMMO**:
- Oddiy text blocks
- Interaktivlik yo'q
- Real hayotiy misol yo'q
- Rol switcher yo'q
- Xatolar va xavfli amallar ko'rsatilmagan

---

### 2.2. YANGI STRUKTURA

```
┌─────────────────────────────────────────────────────────────┐
│ 🏠 Lenza ERP — Interaktiv Qo'llanma                         │
│ "Amaliy bilim, nazariy gap emas"                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 👤 ROL TANLANG: [Admin ▼] [Owner] [Accountant] [Sales] ... │
│                                                              │
│ Sizning rolingizga tegishli bo'limlar ko'rsatiladi          │
└─────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 BO'LIMLAR

1️⃣ KIRISH — ERP falsafasi
   ├─ Nima uchun shunday qurilgan
   ├─ Asosiy printsiplar
   └─ Rollar tizimi

2️⃣ ROLLAR BO'YICHA QO'LLANMALAR
   ├─ 🔧 Admin (Tizim boshqaruvchisi)
   ├─ 👔 Direktor/Owner (Biznes egasi)
   ├─ 💰 Moliyachi (Accountant)
   ├─ 📊 Sotuv menejeri (Sales Manager)
   └─ 📦 Omborchi (Warehouse)

3️⃣ MODULLAR BO'YICHA QO'LLANMALAR (A-Z)
   ├─ Catalog (Katalog)
   ├─ Dashboard (Boshqaruv paneli)
   ├─ Dealers (Dillerlar)
   ├─ Defects (Defektlar)
   ├─ Finance (Moliya)
   ├─ Inventory (Inventar)
   ├─ KPI (Ko'rsatkichlar)
   ├─ Orders (Buyurtmalar)
   ├─ Returns (Qaytishlar)
   ├─ Settings (Sozlamalar)
   └─ Users (Foydalanuvchilar)

4️⃣ TEZ-TEZ UCHRAYDIGAN XATOLAR (FAQ)
   ├─ Texnik xatolar
   ├─ Foydalanuvchi xatolari
   └─ Yechimlar

5️⃣ TO'G'RI / NOTO'G'RI ISHLATISH
   ├─ ✅ Tavsiya etiladi
   ├─ ⚠️ Xavfli amallar
   └─ ❌ Qat'iyan man etiladi

6️⃣ QISQA "CHEAT SHEETS"
   ├─ Kundalik ishlar
   ├─ Oylik ishlar
   ├─ Tez yordam (Quick Help)
   └─ Klaviatura shortcutlari

7️⃣ VIDEO QOLLANMALAR
   ├─ Yangi xodim uchun (Onboarding)
   ├─ Har bir modul uchun
   └─ Muammolarni hal qilish

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### 2.3. INTERAKTIV KOMPONENTLAR (Texnik implementatsiya)

#### **1. Role Switcher** (Rol almashtirgich)

```typescript
interface RoleSwitcherProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

// Foydalanuvchi rol tanlasa, faqat o'sha rolga tegishli bo'limlar ko'rsatiladi
<RoleSwitcher
  currentRole="admin"
  onRoleChange={(role) => filterContentByRole(role)}
/>
```

**Qanday ishlaydi:**
1. Foydalanuvchi rol tanlaydi (masalan, "Sotuv menejeri")
2. Sidebar va content filtrlanadi — faqat Sales uchun tegishli bo'limlar chiqadi
3. Qolgan bo'limlar hidden yoki disabled

---

#### **2. Step-by-Step Workflow** (Bosqichma-bosqich jarayon)

```typescript
<WorkflowSteps
  title="Order yaratish jarayoni"
  steps={[
    {
      step: 1,
      title: "Diller tanlash",
      description: "Kimga buyurtma berilayotganini tanlang",
      example: "Diller: ALFA DOOR (Toshkent)",
      warning: "⚠️ Dillerni o'zgartirsangiz barcha mahsulotlar o'chadi"
    },
    {
      step: 2,
      title: "Mahsulot qo'shish",
      description: "Buyurtma tarkibini to'ldiring",
      example: "Дверь ПГ 800мм — 5 dona — $120/dona",
      warning: "⚠️ Stokni tekshiring, yetarli bo'lishi kerak"
    },
    {
      step: 3,
      title: "Chegirma berish (ixtiyoriy)",
      description: "Agar kerak bo'lsa chegirma qo'shing",
      example: "10% chegirma yoki $50 fixed",
      warning: "❌ 100% dan ortiq chegirma berib bo'lmaydi"
    },
    {
      step: 4,
      title: "Saqlash va tasdiqlash",
      description: "Orderní saqlang, admin tasdiqlaydi",
      example: "Status: CREATED → CONFIRMED",
      success: "✅ Order yaratildi! Raqami: ORD-15.12.2024-001"
    }
  ]}
/>
```

**Vizual ko'rinish:**
```
┌──────────────────────────────────────────────┐
│ 📝 Order yaratish jarayoni                   │
├──────────────────────────────────────────────┤
│                                              │
│  [1] ──→ [2] ──→ [3] ──→ [4]               │
│  Diller  Mahsulot Chegirma Saqlash          │
│                                              │
│  ⚠️ Hozir: Mahsulot qo'shish                │
│                                              │
│  📦 Mahsulot: [Tanlang ▼]                   │
│  🔢 Miqdor:   [______]                      │
│  💵 Narx:     $120                          │
│                                              │
│  ⚠️ Diqqat: Omborda 150 dona mavjud         │
│                                              │
│  [← Orqaga]  [Keyingi →]                    │
└──────────────────────────────────────────────┘
```

---

#### **3. Real-Life Examples** (Haqiqiy misollar)

```typescript
<ExampleScenario
  title="❓ Agar diller mahsulot qaytarsa — nima qilinadi?"
  type="common"
  steps={[
    {
      actor: "Diller",
      action: "Mahsulot qaytarish uchun murojaat qiladi",
      note: "Sabab: Rang mos kelmadi, sifat yomon, yoki boshqa"
    },
    {
      actor: "Sotuv menejeri",
      action: "Qaytishni qabul qilishga rozi bo'ladi",
      note: "Kompaniya siyosatiga qarab (masalan, 7 kun ichida)"
    },
    {
      actor: "Omborchi",
      action: "Mahsulotni qabul qiladi va tizimga kiritadi",
      instruction: "Returns → Create Return → Diller tanlash → Mahsulot qo'shish → Holat: Healthy yoki Defect",
      warning: "⚠️ Agar defekt bo'lsa — 'Defect' tanlang, aks holda 'Healthy'"
    },
    {
      actor: "Sistema",
      action: "Avtomatik hisob-kitob",
      result: [
        "✅ Healthy mahsulot → OK stokka qo'shiladi",
        "❌ Defect mahsulot → Defect stokka qo'shiladi",
        "💰 Diller qarzi kamayadi (qaytargan summa)"
      ]
    },
    {
      actor: "Moliyachi",
      action: "Qarzni tekshiradi va tasdiqlaydi",
      note: "Reconciliation PDF yaratiladi"
    }
  ]}
/>
```

---

#### **4. Warning Blocks** (Ogohlantirish bloklari)

Har bir sahifada quyidagi bloklar bo'lishi kerak:

```typescript
// ⚠️ XAVFLI AMAL
<AlertBox type="danger" icon="⚠️">
  <strong>XAVFLI AMAL</strong>
  <ul>
    <li>Opening balance bir marta kiritiladi va o'zgartirilmaydi</li>
    <li>Agar noto'g'ri kiritilsa — barcha qarzlar buzilib qoladi</li>
    <li>O'zgartirish uchun Admin bilan bog'laning</li>
  </ul>
</AlertBox>

// ✅ TAVSIYA
<AlertBox type="success" icon="✅">
  <strong>TAVSIYA</strong>
  <ul>
    <li>Har kuni valyuta kursini yangilang (Settings → Exchange Rates)</li>
    <li>Orderlarni tasdiqlashdan oldin stokni tekshiring</li>
    <li>Har hafta inventory'ni tekshiring</li>
  </ul>
</AlertBox>

// ❌ QATIYAN MAN ETILADI
<AlertBox type="error" icon="❌">
  <strong>QATIYAN MAN ETILADI</strong>
  <ul>
    <li>Tasdiqlangan orderni o'chirish</li>
    <li>Defekt mahsulotni OK stokka qo'shish</li>
    <li>Admin rolini barcha xodimlarga berish</li>
    <li>Valyuta kursini taxminiy kiritish</li>
  </ul>
</AlertBox>

// ℹ️ BILISH KERAK
<AlertBox type="info" icon="ℹ️">
  <strong>BILISH KERAK</strong>
  <ul>
    <li>Order CREATED statusda 7 kun ichida avtomatik bekor qilinadi (agar tasdiqlanmasa)</li>
    <li>Sessiya 30 daqiqa harakatsizlikdan keyin tugaydi</li>
    <li>Barcha o'zgarishlar audit log'ga yoziladi</li>
  </ul>
</AlertBox>
```

---

#### **5. Interactive Accordion** (Ochiladigan bo'limlar)

```typescript
<AccordionSection title="🔍 Tez-tez beriladigan savollar">
  <AccordionItem
    question="❓ Order yaratdim, lekin tasdiqlanmayapti — nima qilish kerak?"
    answer={
      <>
        <p><strong>Sabab:</strong> Admin hali tasdiqlash uchun ko'rmagan yoki statusni o'zgartirmagan.</p>
        <p><strong>Yechim:</strong></p>
        <ol>
          <li>Orders sahifasida statusni tekshiring — CREATED bo'lishi kerak</li>
          <li>Adminni xabardor qiling (Telegram yoki ichki chat)</li>
          <li>Admin Orders → Status: CONFIRMED qilishi kerak</li>
        </ol>
        <AlertBox type="info">
          ℹ️ CREATED statusdagi orderlar 7 kun ichida avtomatik bekor qilinadi
        </AlertBox>
      </>
    }
  />

  <AccordionItem
    question="❓ Valyuta kursi qaerda o'zgartiriladi?"
    answer={
      <>
        <p>Settings → Exchange Rates → Add Rate</p>
        <p>Har kuni yangi kurs qo'shiladi (masalan, 1 USD = 12,700 UZS)</p>
        <AlertBox type="warning">
          ⚠️ Noto'g'ri kurs kiritilsa, barcha USD/UZS konvertatsiyalar noto'g'ri hisoblanadi!
        </AlertBox>
      </>
    }
  />

  <AccordionItem
    question="❓ Diller qarzi noto'g'ri ko'rsatilmoqda — sababi nima?"
    answer={
      <>
        <p><strong>Sabablari:</strong></p>
        <ul>
          <li>Opening balance noto'g'ri kiritilgan</li>
          <li>To'lov noto'g'ri hisobda yoki dillersiz kiritilgan</li>
          <li>Return qayd qilinmagan</li>
          <li>Order tasdiqlangan, lekin to'lov yo'q</li>
        </ul>
        <p><strong>Yechim:</strong></p>
        <ol>
          <li>Dealers → Dillarni tanlang → Balance ustuni ko'ring</li>
          <li>Reconciliation PDF yuklab oling</li>
          <li>Orderlar, to'lovlar, returnlarni birma-bir tekshiring</li>
          <li>Agar xato topsangiz — Admin bilan bog'laning</li>
        </ol>
      </>
    }
  />
</AccordionSection>
```

---

#### **6. Cheat Sheet** (Tez yordam)

```typescript
<CheatSheet title="⚡ Kundalik ishlar — Tez qo'llanma">
  <CheatSheetSection role="Sales Manager">
    <h4>🌅 Ertalab (9:00 - 10:00)</h4>
    <ul>
      <li>✅ Tizimga kirish</li>
      <li>✅ Dashboard → Yangi orderlarni ko'rish</li>
      <li>✅ Dillerlardan kelib tushgan so'rovlarni qarab chiqish</li>
      <li>✅ Valyuta kursini tekshirish (Settings → Exchange Rates)</li>
    </ul>

    <h4>🌞 Kun davomida (10:00 - 18:00)</h4>
    <ul>
      <li>📞 Diller buyurtmasi qabul qilish → Orders → Create Order</li>
      <li>📦 Mahsulotlarni qo'shish → Stokni tekshirish</li>
      <li>💰 Chegirma berish (agar kerak bo'lsa) → Save</li>
      <li>🔔 Adminni tasdiqlash uchun xabardor qilish (Telegram)</li>
      <li>📊 KPI'ni tekshirish → Haftalik maqsadga yetdingizmi?</li>
    </ul>

    <h4>🌆 Kechqurun (18:00 - 19:00)</h4>
    <ul>
      <li>✅ Bugungi orderlarni ko'rib chiqish</li>
      <li>✅ Tasdiqlangan orderlarni tekshirish</li>
      <li>📄 Reconciliation yuborish (agar oy oxiri bo'lsa)</li>
      <li>🚪 Tizimdan chiqish</li>
    </ul>
  </CheatSheetSection>

  <CheatSheetSection role="Warehouse">
    <h4>🌅 Ertalab (8:00 - 9:00)</h4>
    <ul>
      <li>✅ Tizimga kirish</li>
      <li>📦 Orders → Status: CONFIRMED → Ro'yxatni ko'rish</li>
      <li>🏭 Eng muhimlarini ajratish (tezkor yetkazish)</li>
    </ul>

    <h4>🌞 Kun davomida (9:00 - 18:00)</h4>
    <ul>
      <li>📦 Mahsulotlarni yig'ish (Picking)</li>
      <li>✅ Status → PACKED (yig'ilgandan keyin)</li>
      <li>🚚 Yuborish (Shipping)</li>
      <li>✅ Status → SHIPPED</li>
      <li>📞 Diller qo'ng'iroq qildi → Yetib bordi</li>
      <li>✅ Status → DELIVERED</li>
    </ul>

    <h4>🌆 Kechqurun (18:00 - 19:00)</h4>
    <ul>
      <li>✅ Bugungi bajarilgan orderlar sonini ko'rish (KPI)</li>
      <li>📊 Ombor holatini tekshirish (Inventory)</li>
      <li>⚠️ Kam qolgan mahsulotlar haqida xabar berish</li>
      <li>🚪 Tizimdan chiqish</li>
    </ul>
  </CheatSheetSection>
</CheatSheet>
```

---

#### **7. Before/After Comparison** (Nima bo'ladi agar...)

```typescript
<BeforeAfterScenario
  title="💡 Nima bo'ladi agar valyuta kursini noto'g'ri kiritsa?"
  before={{
    title: "❌ NOTO'G'RI",
    scenario: "Moliyachi valyuta kursini taxminiy kiritdi: 1 USD = 10,000 UZS (haqiqiy: 12,700 UZS)",
    consequences: [
      "🔴 Barcha orderlar noto'g'ri hisoblanadi",
      "🔴 USD'dagi qarzlar UZS'da kam ko'rsatiladi",
      "🔴 Moliyaviy hisobotlar noto'g'ri",
      "🔴 Dillerlar ortiqcha to'laydi yoki kam to'laydi",
      "🔴 Kompaniya zarar ko'radi"
    ],
    example: {
      order: "Order: $1,000",
      wrongCalc: "10,000 * 1,000 = 10,000,000 UZS",
      correctCalc: "12,700 * 1,000 = 12,700,000 UZS",
      loss: "Yo'qotish: 2,700,000 UZS"
    }
  }}
  after={{
    title: "✅ TO'G'RI",
    scenario: "Moliyachi har kuni rasmiy kursni kiritadi: 1 USD = 12,700 UZS",
    benefits: [
      "✅ Barcha hisob-kitoblar to'g'ri",
      "✅ Qarzlar aniq ko'rsatiladi",
      "✅ Moliyaviy hisobotlar ishonchli",
      "✅ Dillerlar to'g'ri summa to'laydi",
      "✅ Kompaniya foydada"
    ],
    howTo: [
      "1. Har kuni ertalab Settings → Exchange Rates → Add Rate",
      "2. Sana va kursni kiriting",
      "3. Save",
      "4. Orderlar yaratilganda avtomatik ishlatiladi"
    ]
  }}
/>
```

---

### 2.4. KEYBOARD SHORTCUTS (Klaviatura tezliklari)

Qo'llanmaga klaviatura shortcutlari ham qo'shiladi:

```typescript
<KeyboardShortcuts>
  <ShortcutGroup title="Umumiy">
    <Shortcut keys="Ctrl + K" action="Global qidiruv" />
    <Shortcut keys="Ctrl + /" action="Qo'llanmani ochish" />
    <Shortcut keys="Ctrl + S" action="Saqlash" />
    <Shortcut keys="Esc" action="Modal/Dialog yopish" />
  </ShortcutGroup>

  <ShortcutGroup title="Navigatsiya">
    <Shortcut keys="Ctrl + 1" action="Dashboard" />
    <Shortcut keys="Ctrl + 2" action="Orders" />
    <Shortcut keys="Ctrl + 3" action="Dealers" />
    <Shortcut keys="Ctrl + 4" action="Products" />
    <Shortcut keys="Ctrl + 9" action="Settings" />
  </ShortcutGroup>

  <ShortcutGroup title="Orders sahifasida">
    <Shortcut keys="Ctrl + N" action="Yangi order yaratish" />
    <Shortcut keys="Ctrl + E" action="Tanlangan orderni tahrirlash" />
    <Shortcut keys="Ctrl + P" action="PDF yuklab olish" />
  </ShortcutGroup>
</KeyboardShortcuts>
```

---

## III. TO'LIQ NAMUNAVIY QO'LLANMA — "ORDERS" MODULI

Quyida bitta modul uchun to'liq yozilgan interaktiv qo'llanma namunasi:

---

# 📦 ORDERS (BUYURTMALAR) — TO'LIQ QO'LLANMA

## 📋 Mundarija

1. [Umumiy ma'lumot](#umumiy-malumot)
2. [Kimlar ishlatadi](#kimlar-ishlatadi)
3. [Order yaratish — Bosqichma-bosqich](#order-yaratish)
4. [Order statuslari va jarayon](#order-statuslari)
5. [To'g'ri / Noto'g'ri ishlatish](#togri-notogri)
6. [Tez-tez uchraydigan xatolar](#xatolar)
7. [Real hayotiy misollar](#real-misollar)
8. [Cheat Sheet](#cheat-sheet)

---

## 1. UMUMIY MA'LUMOT {#umumiy-malumot}

**Nima uchun kerak:**
Orders moduli — Lenza ERP'ning markaziy qismi. Bu yerda diller buyurtmalari yaratiladi, kuzatiladi va bajariladi. Order yaratilishi — qarzning boshlanishi, yetkazilishi — daromadning amalga oshishi.

**Asosiy vazifalar:**
- Diller buyurtmalarini ro'yxatga olish
- Mahsulot tarkibini kiritish
- Chegirma berish (agar kerak bo'lsa)
- Statusni kuzatish (yaratildi → tasdiqlandi → yig'ildi → yuborildi → yetkazildi)
- Qarzlarni hisoblash

**Qanday ishlaydi:**
```
Diller murojaat qiladi
     ↓
Sotuv menejeri tizimga order yaratadi (CREATED)
     ↓
Admin tasdiqlaydi va kurs kiritadi (CONFIRMED)
     ↓
Omborchi mahsulotlarni yig'adi (PACKED)
     ↓
Omborchi yuboradi (SHIPPED)
     ↓
Diller qabul qiladi (DELIVERED)
     ↓
To'lov kelib tushadi (diller qarzi kamayadi)
```

---

## 2. KIMLAR ISHLATADI {#kimlar-ishlatadi}

| Rol | Nima qiladi | Ruxsatlari |
|-----|-------------|------------|
| **Admin** | Barcha orderlarni boshqaradi | ✅ Yaratish, tahrirlash, o'chirish, statusni o'zgartirish |
| **Sotuv menejeri** | O'z orderlarini yaratadi | ✅ Yaratish (faqat o'ziniki), ✅ Tahrirlash (CREATED statusda), ❌ O'chirish |
| **Omborchi** | Orderlarni bajaradi | ✅ Status o'zgartirish (faqat ketma-ket), ❌ Yaratish, ❌ Tahrirlash |
| **Moliyachi** | Nazorat qiladi | ✅ Ko'rish, ✅ PDF yuklab olish, ❌ Tahrirlash |
| **Direktor** | Hisobotlarni ko'radi | ✅ Ko'rish, ✅ Statistika, ❌ Tahrirlash |

---

## 3. ORDER YARATISH — BOSQICHMA-BOSQICH {#order-yaratish}

### Bosqich 1: Orders sahifasiga kirish

```
Chap menu → Orders → Create Order tugmasi
```

**Ekranda ko'rsatiladi:**
- Barcha mavjud orderlar ro'yxati
- Filtrlar (status, diller, sana)
- "Create Order" tugmasi (o'ng yuqorida)

---

### Bosqich 2: Diller tanlash

<AlertBox type="warning">
⚠️ <strong>DIQQAT</strong>: Dillerni to'g'ri tanlang! Keyinchalik o'zgartirsangiz barcha mahsulotlar o'chadi.
</AlertBox>

**Qanday qilish:**
1. "Dealer" maydonini bosing
2. Ro'yxatdan kerakli dillerni toping (qidiruv ishlaydi)
3. Tanlang

**Misol:**
```
Dealer: [ALFA DOOR (Toshkent) ▼]
```

<AlertBox type="info">
ℹ️ <strong>BILISH KERAK</strong>: Faqat faol (active) dillerlar ro'yxatda chiqadi.
</AlertBox>

---

### Bosqich 3: Mahsulot qo'shish

**Qanday qilish:**
1. "Add Item" tugmasini bosing
2. Mahsulot tanlang (dropdown yoki qidiruv)
3. Miqdorni kiriting
4. Narx avtomatik ko'rsatiladi (o'zgartirish mumkin, agar admin bo'lsangiz)
5. "Add" tugmasini bosing
6. Yana mahsulot qo'shish uchun 1-5ni takrorlang

**Misol:**
```
╔══════════════════════════════════════════════════════╗
║ Mahsulot: [Дверь ПГ 800мм (Белый) ▼]                ║
║ Miqdor:   [5___]                                     ║
║ Narx:     $120.00 (auto)                             ║
║ Jami:     $600.00                                    ║
║                                                      ║
║ Omborda: 150 dona ✅                                 ║
║                                                      ║
║ [Add Item]                                           ║
╚══════════════════════════════════════════════════════╝
```

<AlertBox type="warning">
⚠️ <strong>XAVFLI</strong>: Stokni tekshiring! Agar yetarli bo'lmasa, order bajarilmaydi.
</AlertBox>

<AlertBox type="success">
✅ <strong>TAVSIYA</strong>: Mahsulot qo'shishdan oldin stokni tekshiring (Products sahifasida).
</AlertBox>

---

### Bosqich 4: Chegirma berish (ixtiyoriy)

Agar diller doimiy mijoz bo'lsa yoki katta hajm bo'lsa, chegirma berishingiz mumkin.

**Chegirma turlari:**
1. **Percentage (foiz)**: Masalan, 10% chegirma
2. **Fixed amount (aniq summa)**: Masalan, $50 chegirma

**Misol:**
```
Chegirma turi: [Percentage ▼]
Qiymat:        [10__]%

Jami (chegirmasiz):  $1,200.00
Chegirma (-10%):     -$120.00
─────────────────────────────
UMUMIY SUMMA:        $1,080.00
```

<AlertBox type="error">
❌ <strong>QATIYAN MAN ETILADI</strong>: 100% dan ortiq chegirma berish mumkin emas!
</AlertBox>

---

### Bosqich 5: Saqlash

Barcha ma'lumotlarni to'ldirgandan keyin:

1. "Save Order" tugmasini bosing
2. Tizim tekshiradi:
   - Diller tanlanganmi?
   - Mahsulot bormi?
   - Stok yetarlimi?
3. Agar hammasi to'g'ri bo'lsa:
   ```
   ✅ Order yaratildi!
   Raqam: ORD-15.12.2024-001
   Status: CREATED
   ```

4. Orderlar ro'yxatida ko'rinadi

<AlertBox type="info">
ℹ️ <strong>KEYINGI QADAM</strong>: Adminni xabardor qiling (Telegram yoki chat orqali) tasdiqlash uchun.
</AlertBox>

---

## 4. ORDER STATUSLARI VA JARAYON {#order-statuslari}

### Status o'zgarish sxemasi

```
[CREATED] ──────────→ [CONFIRMED] ──────────→ [PACKED]
   ↓                       ↓                      ↓
Sotuv yaratdi         Admin tasdiqladi      Omborchi yig'di
                                                   ↓
[DELIVERED] ←──────── [SHIPPED] ←────────────────┘
       ↓                  ↓
   Yetkazildi        Yuborildi
       ↓
   [RETURNED] (agar qaytarilsa)
```

### Har bir statusning ma'nosi

| Status | Kimning vazifasi | Nima bo'ladi | Keyingi qadam |
|--------|------------------|--------------|---------------|
| **CREATED** | Sotuv menejeri | Order yaratildi, kutilmoqda | Admin tasdiqlashi kerak |
| **CONFIRMED** | Admin | Tasdiqlandi, valyuta kursi kiritildi | Omborchi yig'ishi kerak |
| **PACKED** | Omborchi | Mahsulotlar yig'ildi, tayyor | Omborchi yuborishi kerak |
| **SHIPPED** | Omborchi | Yuborildi, yo'lda | Diller qabul qilishi kerak |
| **DELIVERED** | Omborchi/Diller | Yetkazildi, bajarildi | To'lov kutilmoqda |
| **RETURNED** | Omborchi | Qaytarildi | Returns modulida qayd qilinadi |
| **CANCELLED** | Admin | Bekor qilindi | Hech narsa |

### Kim qanday statusni o'zgartira oladi?

**Admin:**
- Har qanday statusni har qanday statusga o'zgartira oladi

**Sotuv menejeri:**
- Faqat o'z orderlarini CREATED statusda tahrirlash va statusni o'zgartirish

**Omborchi:**
- **Faqat ketma-ket!**
  - CONFIRMED → PACKED ✅
  - PACKED → SHIPPED ✅
  - SHIPPED → DELIVERED ✅
  - CONFIRMED → SHIPPED ❌ (sakrab bo'lmaydi)

<AlertBox type="error">
❌ <strong>XATO</strong>: Omborchi CONFIRMED'dan to'g'ridan-to'g'ri SHIPPED'ga o'tkaza olmaydi!
</AlertBox>

---

## 5. TO'G'RI / NOTO'G'RI ISHLATISH {#togri-notogri}

### ✅ TO'G'RI

1. **Order yaratishdan oldin:**
   - Dillerning faoligini tekshiring
   - Mahsulot stokini tekshiring
   - Valyuta kursining kiritilganini tekshiring

2. **Order yaratishda:**
   - To'g'ri diller tanlash
   - Miqdorni diqqat bilan kiriting
   - Stok yetarlimi ekanini tekshiring
   - Chegirmani hisoblang

3. **Order yaratgandan keyin:**
   - Adminni xabardor qiling
   - PDF yuklab olib dilerga yuboring
   - Statusni kuzatib turing

### ❌ NOTO'G'RI

1. **Qilinmasligi kerak:**
   - ❌ Tasdiqlangan orderni o'chirish
   - ❌ Dillerni keyinchalik o'zgartirish
   - ❌ Stokni tekshirmasdan order yaratish
   - ❌ Chegirmani noto'g'ri kiritish (150% kabi)
   - ❌ Valyuta kursini taxminiy kiritish

2. **Xavfli amallar:**
   - ⚠️ CREATED statusdagi orderni 7 kundan ortiq qoldirish (avtomatik bekor qilinadi)
   - ⚠️ Statusni sakratib o'tkazish (omborchi uchun)
   - ⚠️ Order yaratib tasdiqlashni unutish

---

## 6. TEZ-TEZ UCHRAYDIGAN XATOLAR {#xatolar}

### ❓ Order yaratdim, lekin tasdiqlanmayapti

**Sabab:** Admin hali ko'rmagan yoki statusni o'zgartirmagan.

**Yechim:**
1. Orders sahifasida statusni tekshiring — CREATED bo'lishi kerak
2. Adminni xabardor qiling
3. Agar 7 kundan oshsa — bekor qilinadi

---

### ❓ "Insufficient stock" xatosi chiqmoqda

**Sabab:** Omborda mahsulot yetarli emas.

**Yechim:**
1. Products sahifasiga o'ting
2. Mahsulotni toping
3. Stock (OK) ustunini ko'ring
4. Agar yetarli bo'lmasa:
   - Miqdorni kamaytiring, yoki
   - Mahsulot kelguncha kuting

**Misol:**
```
Mahsulot: Дверь ПГ 800мм
Omborda: 3 dona
Sizning orderingiz: 5 dona
❌ Xato: Yetarli emas! (2 dona kam)
✅ Yechim: 3 dona yoki undan kam buyurtma bering
```

---

### ❓ Chegirma kiritdim, lekin summa o'zgarmayapti

**Sabab:** Chegirma turi yoki qiymat noto'g'ri.

**Yechim:**
1. Chegirma turini tekshiring (Percentage yoki Fixed)
2. Qiymatni to'g'ri kiriting (masalan, 10 emas, 10%)
3. "Calculate" tugmasini bosing (agar bo'lsa)
4. Refresh qiling

---

### ❓ Order o'chirilmayapti

**Sabab:** Tasdiqlangan (CONFIRMED yoki undan yuqori) orderlarni o'chirish mumkin emas.

**Yechim:**
1. Agar CREATED statusda bo'lsa — o'chirish mumkin
2. Agar CONFIRMED yoki undan yuqori bo'lsa:
   - Admin bilan bog'laning
   - Status CANCELLED ga o'zgartiriladi (o'chirilmaydi)

<AlertBox type="info">
ℹ️ <strong>SABAB</strong>: Tasdiqlangan orderlar qarzga ta'sir qiladi, shuning uchun o'chirib bo'lmaydi.
</AlertBox>

---

## 7. REAL HAYOTIY MISOLLAR {#real-misollar}

### Misol 1: Oddiy order

**Vaziyat:** "ALFA DOOR" kompaniyasi 10 ta oq eshik buyurmoqchi.

**Qadam-baqadam:**

1. **Orders → Create Order**
2. **Diller tanlash:**
   ```
   Dealer: ALFA DOOR (Toshkent)
   ```
3. **Mahsulot qo'shish:**
   ```
   Mahsulot: Дверь ПГ 800мм (Белый)
   Miqdor: 10
   Narx: $120/dona
   Jami: $1,200
   ```
4. **Chegirma:** Yo'q
5. **Save Order**
6. **Natija:**
   ```
   ✅ Order yaratildi!
   Raqam: ORD-15.12.2024-123
   Status: CREATED
   Jami: $1,200.00
   ```
7. **Adminni xabardor qilish:** Telegram orqali
8. **Admin tasdiqlaydi:** Status → CONFIRMED
9. **Omborchi yig'adi:** Status → PACKED → SHIPPED → DELIVERED

---

### Misol 2: Chegirmali order

**Vaziyat:** "MEGA DOORS" doimiy mijoz, 100 ta eshik buyurmoqchi, 10% chegirma beriladi.

**Qadam-baqadam:**

1. **Orders → Create Order**
2. **Diller tanlash:**
   ```
   Dealer: MEGA DOORS (Samarqand)
   ```
3. **Mahsulot qo'shish:**
   ```
   Mahsulot: Дверь ПО 900мм (Венге)
   Miqdor: 100
   Narx: $150/dona
   Jami: $15,000
   ```
4. **Chegirma berish:**
   ```
   Chegirma turi: Percentage
   Qiymat: 10%

   Jami (chegirmasiz): $15,000.00
   Chegirma (-10%):    -$1,500.00
   ─────────────────────────────
   UMUMIY SUMMA:       $13,500.00
   ```
5. **Save Order**
6. **Natija:**
   ```
   ✅ Order yaratildi!
   Raqam: ORD-15.12.2024-124
   Status: CREATED
   Jami: $13,500.00
   Chegirma: $1,500.00 (10%)
   ```

---

### Misol 3: Muammoli holat — Stok yetarli emas

**Vaziyat:** Diller 50 ta eshik buyurmoqchi, lekin omborda faqat 30 ta bor.

**Noto'g'ri yondashuv:**
```
❌ Shunchaki 50 ta deb yozish
   → Order yaratiladi
   → Admin tasdiqlaydi
   → Omborchi yig'ay deb ketganda 20 ta kam
   → Muammo!
```

**To'g'ri yondashuv:**
```
✅ Avval stokni tekshiring:
   Products → Дверь ПГ 800мм → Stock: 30 dona

✅ Dilerga xabar bering:
   "Hozirda 30 ta bor, qolgani keyinroq yetkazamiz"

✅ Ikki xil variant:
   a) 30 ta uchun order yarating (hozir)
   b) 20 ta uchun alohida order yarating (keyin)

   yoki

   c) Bitta order (50 ta) yarating, lekin:
      → Adminni ogohlantiring
      → Ombordagi 30 tasini yuborishni belgilang
      → 20 tasi uchun keyingi yetkazish rejalashtiring
```

---

## 8. CHEAT SHEET — TEZ YORDAM {#cheat-sheet}

### Sotuv menejeri uchun

```
┌─────────────────────────────────────────────────────┐
│ ⚡ ORDER YARATISH — 5 DAQIQALIK YO'RIQNOMA          │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 1️⃣ Orders → Create Order                           │
│ 2️⃣ Diller tanlash                                  │
│ 3️⃣ Mahsulot qo'shish (stokni tekshir!)            │
│ 4️⃣ Chegirma (agar kerak bo'lsa)                    │
│ 5️⃣ Save → Adminni xabardor qil                     │
│                                                     │
│ ✅ Eslatma:                                         │
│ • Stokni avval tekshir                              │
│ • Chegirmani hisoblang                              │
│ • PDF yuklab dilerga yubor                          │
│                                                     │
│ ⚠️ Xavfli:                                          │
│ • Dillerni keyinchalik o'zgartirmaslik              │
│ • Tasdiqlashni unutmaslik                           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Omborchi uchun

```
┌─────────────────────────────────────────────────────┐
│ ⚡ ORDER BAJARISH — QADAM-BAQADAM                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 1️⃣ Orders → Status: CONFIRMED → Ro'yxat           │
│ 2️⃣ Orderni och → Mahsulotlarni ko'r               │
│ 3️⃣ Ombordan mahsulotlarni yig'                     │
│ 4️⃣ Status → PACKED ✅                              │
│ 5️⃣ Yuk mashinasiga yuklash                         │
│ 6️⃣ Status → SHIPPED ✅                             │
│ 7️⃣ Diller qabul qildi → Status → DELIVERED ✅      │
│                                                     │
│ ⚠️ MUHIM:                                           │
│ • Statusni faqat ketma-ket o'zgartir!               │
│ • Sakrab o'tkazish mumkin emas!                     │
│                                                     │
│ ✅ To'g'ri:                                         │
│   CONFIRMED → PACKED → SHIPPED → DELIVERED         │
│                                                     │
│ ❌ Noto'g'ri:                                       │
│   CONFIRMED → SHIPPED (sakratish mumkin emas!)     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 XULOSA

**Orders moduli** — Lenza ERP'ning eng muhim qismi. Bu yerda:
- Diller buyurtmalari boshqariladi
- Savdo jarayoni kuzatiladi
- Qarzlar hisoblanadi
- Moliyaviy oqim boshlanadi

**Muhim eslatmalar:**
1. ✅ Har doim stokni tekshiring
2. ✅ Dillerni to'g'ri tanlang
3. ✅ Chegirmani hisoblang
4. ✅ Statusni kuzatib turing
5. ⚠️ Omborchi faqat ketma-ket status o'zgartiradi
6. ❌ Tasdiqlangan orderni o'chirmaslik

**Yordam kerakmi?**
- 📞 Admin bilan bog'laning
- 📚 FAQ bo'limini ko'ring
- 💬 Telegram chatda savol bering

---

**KEYINGI QO'LLANMA:** [Finance (Moliya) moduli](./finance.md)

