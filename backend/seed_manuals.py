"""
Seed script for User Manuals
Run: python seed_manuals.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core.models import UserManual

def seed_manuals():
    manuals = [
        {
            'title': 'Admin paneli - Asosiy funksiyalar',
            'role': 'admin',
            'content': '''# Administrator qo'llanmasi

## Asosiy vazifalar

### 1. Tizim sozlamalari
- **Sozlamalar** menyusiga kiring
- Kompaniya ma'lumotlarini yangilang (logo, manzil, bank rekvizitlari)
- Tizim parametrlarini sozlang
- Backup yarating muntazam ravishda

### 2. Foydalanuvchilarni boshqarish
- Yangi foydalanuvchi qo'shish:
  * Users sahifasiga o'ting
  * "Yaratish" tugmasini bosing
  * Login, parol va rolni tanlang
  * 2FA majburiy rollar uchun avtomatik yoqiladi

### 3. KPI monitoring
- KPI sahifasida barcha ko'rsatkichlarni ko'ring
- Har bir rol uchun alohida KPI mavjud
- Filtrlar yordamida ma'lumotlarni tahlil qiling

### 4. Audit va xavfsizlik
- Audit log'larni muntazam tekshiring
- Shubhali harakatlarni monitoring qiling
- Backup nusxalarini tashqi diskda saqlang

### 5. Umumiy maslahatlar
- Har kuni tizim holatini tekshiring
- Foydalanuvchilar uchun yo'riqnoma yarating
- Muammoli ma'lumotlarni darhol hal qiling
'''
        },
        {
            'title': 'Direktor paneli - Asosiy ko\'rsatkichlar',
            'role': 'director',
            'content': '''# Direktor qo'llanmasi

## Dashboard asosiy ko'rsatkichlari

### 1. Moliyaviy ko'rsatkichlar
- **Umumiy daromad**: Jami tushum USD da
- **Sof foyda**: Daromad minus xarajatlar
- **Kassa qoldig'i**: Joriy kassa balansi

### 2. Buyurtmalar
- **Ochiq buyurtmalar**: Hali yopilmagan orderlar soni
- Status bo'yicha taqsimlash
- Rezerv vs oddiy buyurtmalar

### 3. Grafik tahlillar
- **Daromad tendentsiyasi**: Oylik daromad grafigi
- **Sotuv vs Foyda**: Qiyosiy tahlil
- **Kategoriya bo'yicha taqsimot**: Eng daromadli yo'nalishlar

### 4. Dilerlar balansi
- Qarzlar jadvalini muntazam tekshiring
- Muddati o'tgan qarzlarni monitoring qiling
- To'lovlarni rejalashtiring

### 5. Strategik qarorlar
- KPI ko'rsatkichlari asosida qaror qabul qiling
- Haftalik/oylik hisobotlarni tahlil qiling
- Savdo menejerlari bilan muntazam uchrashuv o'tkazing
'''
        },
        {
            'title': 'Buxgalter - To\'lovlar va hisobotlar',
            'role': 'accountant',
            'content': '''# Buxgalter qo'llanmasi

## Asosiy vazifalar

### 1. To'lovlarni qayd qilish
- **Payments** sahifasiga o'ting
- Yangi to'lov qo'shish:
  * Dilerni tanlang
  * Summani kiriting (USD yoki UZS)
  * To'lov turini belgilang (naqd/terminal/bank)
  * Hujjat raqamini kiriting

### 2. Valyuta kurslari
- **Kurslar** menyusida kunlik kurslarni yangilang
- Markaziy bank kursi asosida kiriting
- Avtomatik hisoblash ishlashi uchun kursni muntazam yangilang

### 3. Akt sverka
- **Akt sverka** sahifasida diler bilan hisob-kitobni ko'ring
- Buyurtmalar, to'lovlar va qoldiqni tekshiring
- PDF formatda chop eting va imzolang

### 4. Hisobotlar
- **Daromad hisoboti**: Oylik/yillik daromad tahlili
- **To'lovlar hisoboti**: Barcha to'lovlar Excel/PDF formatda
- **Dilerlar balansi**: Har bir diler bo'yicha qoldiq

### 5. KPI
- O'z KPI ko'rsatkichlaringizni kuzating:
  * To'lovlar hajmi
  * Qarzlarni undirish ko'rsatkichi
  * Hujjatlar to'g'riligi

### 6. Maslahatlar
- Har kuni to'lovlarni tekshiring
- Katta summalar uchun direktor tasdig'ini oling
- Barcha hujjatlarni arxivda saqlang
'''
        },
        {
            'title': 'Ombor mudiri - Inventarizatsiya va mahsulotlar',
            'role': 'warehouse',
            'content': '''# Ombor mudiri qo'llanmasi

## Asosiy vazifalar

### 1. Mahsulotlar boshqaruvi
- **Mahsulotlar** sahifasida:
  * Yangi mahsulot qo'shish
  * Narx va zaxira miqdorini yangilash
  * Brand va kategoriya bo'yicha filtrlash

### 2. Zaxira monitoring
- Kam qolgan mahsulotlarni belgilang
- "Stok tugagan" mahsulotlarni ta'minotchilarga buyurtma bering
- Ortiqcha zaxiralarni optimallashting

### 3. Buyurtmalarni komplektlash
- **Buyurtmalar** sahifasida yangi orderlarni ko'ring
- Statusni o'zgartiring:
  * created → confirmed (tasdiqlash)
  * confirmed → packed (to'plash)
  * packed → shipped (jo'natish)

### 4. Qaytarilgan mahsulotlar
- **Qaytishlar** sahifasida:
  * Qaytarilgan mahsulotlarni ro'yxatdan o'tkazing
  * Sababini belgilang (defekt/ortiqcha/noto'g'ri)
  * OK yoki defekt zaxiraga qaytaring

### 5. Inventarizatsiya
- Oylik inventarizatsiya o'tkazing
- Tizim zaxirasini real zaxira bilan solishtiring
- Farqlarni hujjatlashting va adminga bildiring

### 6. Excel export/import
- Mahsulotlarni Excel orqali import qiling
- Template yuklab oling va to'ldiring
- Katta hajmdagi ma'lumotlar uchun import ishlatings

### 7. Xavfsizlik
- Mahsulotlar narxini o'zgartirganingizda audit logga tushadi
- Muhim o'zgarishlar haqida direktorga xabar bering
'''
        },
        {
            'title': 'Sotuv menejeri - Dilerlar va buyurtmalar',
            'role': 'sales',
            'content': '''# Sotuv menejeri qo'llanmasi

## Asosiy vazifalar

### 1. Dilerlarni boshqarish
- **Dilerlar** sahifasida:
  * Yangi diler qo'shish
  * Kontakt ma'lumotlarini yangilash
  * Hudud va kredit limitini belgilang
  * Balansni kuzating

### 2. Buyurtma yaratish
- **Buyurtmalar** sahifasida "Yaratish" tugmasini bosing:
  * Dilerni tanlang
  * Mahsulotlarni qo'shing (brand/kategoriya filtrlari)
  * Miqdor va narxni kiriting
  * Oddiy yoki Bron turini belgilang

### 3. Buyurtma holati
- Buyurtma statusini kuzating:
  * created: yangi buyurtma
  * confirmed: tasdiqlangan
  * packed: to'plangan
  * shipped: jo'natilgan
  * delivered: yetkazilgan

### 4. Hududlar (Regions)
- **Hududlar** sahifasida yangi hudud qo'shing
- Har bir diler hududga biriktiriladi
- Hudud bo'yicha hisobotlarni ko'ring

### 5. KPI ko'rsatkichlari
- O'z KPI'ingizni kuzating:
  * Sotuv hajmi
  * Yangi dilerlar soni
  * Buyurtmalar to'g'riligi
  * Mijozlar qoniqish darajasi

### 6. Dashboard filtrlari
- Diler, hudud, sana bo'yicha filtr qo'llang
- Aniq tahlil uchun bir nechta filtrni birlashting
- Hisobotlarni PDF/Excel formatda yuklab oling

### 7. Qaytarishlar
- Dilerlardan kelgan qaytarishlarni ko'ring
- Sabab va miqdorni tahlil qiling
- Ko'p qaytarilayotgan mahsulotlar haqida omborga xabar bering

### 8. Akt sverka
- Diler bilan oylik akt sverka o'tkazing
- Hisob-kitobni PDF formatda chop eting
- Imzolangan nusxasini buxgalteriyaga topshiring

### 9. Maslahatlar
- Dilerlar bilan muntazam aloqada bo'ling
- Yangi mahsulotlar haqida xabardor qiling
- Kredit limitidan oshmasligini nazorat qiling
- Qarzlarni o'z vaqtida yig'ishga yordam bering
'''
        }
    ]
    
    created_count = 0
    for manual_data in manuals:
        manual, created = UserManual.objects.get_or_create(
            title=manual_data['title'],
            role=manual_data['role'],
            defaults={'content': manual_data['content']}
        )
        if created:
            created_count += 1
            print(f"✓ Created: {manual.title}")
        else:
            print(f"- Already exists: {manual.title}")
    
    print(f"\n{created_count} yangi qo'llanma yaratildi!")
    print(f"Jami: {UserManual.objects.count()} ta qo'llanma")

if __name__ == '__main__':
    seed_manuals()
