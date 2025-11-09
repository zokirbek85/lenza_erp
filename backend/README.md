# Lenza ERP Backend

## Talablar
- Python 3.12+
- PostgreSQL 13+
- Virtual environment (python -m venv .venv)

## O'rnatish
    python -m venv .venv
    source .venv/bin/activate  # Windows: .venv\Scripts\activate
    pip install -r requirements.txt
    python manage.py migrate

## Ishga tushirish
    # faqat HTTP kerak bo'lsa
    python manage.py runserver 0.0.0.0:8000

    # WebSocketlar uchun ASGI serveri
    python -m daphne -b 0.0.0.0 -p 8000 core.asgi:application

## Foydali buyruqlar
- python manage.py backupdb – PostgreSQL dump yaratadi
- python manage.py runbot – Telegram botni ishga tushiradi
- python manage.py createsuperuser – admin foydalanuvchi yaratish
