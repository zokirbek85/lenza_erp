# Lenza ERP ni VPS ga joylashtirish qo'llanmasi

Ushbu hujjat Ubuntu 24.04 dagi toza VPS ga Django (backend) va Vite/React (frontend) dan iborat **Lenza ERP** loyihasini o'rnatish uchun batafsil qadamlarni tushuntiradi. Qo'llanma yangi boshlovchilar uchun yozilgan va barcha buyruqlarni ketma-ket bajarish mumkin.

---

## 1. Kirish
- **Loyiha**: Lenza ERP — buyurtmalar, moliya va hisobotlarni yuritish uchun Django REST API va React/Vite frontendidan iborat ERP tizimi.
- **Maqsad**: VPS ga toza o'rnatish, keyinchalik GitHub'dan yangilashni xavfsiz bajarish.

---

## 2. VPS ga ulanish
1. MobaXterm oching → *Session* → *SSH*.
2. `Remote host` ga VPS IP manzilini yozing: `45.138.159.195`.
3. *Username* sifatida `root` kiriting va **OK** ni bosing.
4. Terminalda qo'lda kiritish misoli:
   ```bash
   ssh root@45.138.159.195
   ```
5. Dastlabki ulanishda "host key" tasdiqlash so'raladi — `yes` deb tasdiqlang.
6. Parolni kiriting (yoki SSH kalitidan foydalaning). Parol ko'rinmaydi, bu normal holat.

---

## 3. Oldingi loyihani tozalash
Bu qadam serverda qolgan eski konfiguratsiyalarni o'chiradi, **PostgreSQL dagi ma'lumotlarga tegmaydi**.

```bash
# Eski systemd servislarini to'xtatish va o'chirish
systemctl stop lenza_erp.service 2>/dev/null || true
systemctl disable lenza_erp.service 2>/dev/null || true
systemctl stop lenza_erp_bot.service 2>/dev/null || true
systemctl disable lenza_erp_bot.service 2>/dev/null || true

# Eski nginx konfiguratsiyalarini olib tashlash
rm -f /etc/nginx/sites-enabled/lenza_erp
rm -f /etc/nginx/sites-available/lenza_erp

# Kod papkasini ehtiyotkorlik bilan o'chirish (PostgreSQL ma'lumotlariga tegmaydi)
rm -rf /opt/lenza_erp
```

> **Ogohlantirish**: `rm -rf /opt/lenza_erp` kodni to'liq o'chiradi. Agar kerakli fayllar bo'lsa, avval zaxiralang.

---

## 4. Zarur paketlarni o'rnatish
```bash
apt update && apt upgrade -y
apt install -y python3 python3-venv python3-pip git nginx postgresql postgresql-contrib build-essential
apt install -y libpq-dev pkg-config
# WeasyPrint/Pillow/PDF uchun kutubxonalar
apt install -y libffi-dev libpango-1.0-0 libpangocairo-1.0-0 libcairo2 libjpeg-dev zlib1g-dev
# Node.js (Vite build uchun)
apt install -y nodejs npm
```

---

## 5. PostgreSQL ni sozlash
1. `postgres` foydalanuvchisiga o'ting:
   ```bash
   sudo -u postgres psql
   ```
2. Quyidagi buyruqlarni bajaring:
   ```sql
   CREATE DATABASE lenza_erp;
   CREATE USER lenza_user WITH PASSWORD 'STRONG_PASSWORD_HERE';
   ALTER ROLE lenza_user SET client_encoding TO 'utf8';
   ALTER ROLE lenza_user SET default_transaction_isolation TO 'read committed';
   ALTER ROLE lenza_user SET timezone TO 'Asia/Tashkent';
   GRANT ALL PRIVILEGES ON DATABASE lenza_erp TO lenza_user;
   \q
   ```
3. `STRONG_PASSWORD_HERE` o'rniga kuchli, murakkab parol yozishni unutmang va uni eslab qoling.

---

## 6. Loyihani joylash uchun papka
```bash
mkdir -p /opt/lenza_erp
cd /opt/lenza_erp
git clone https://github.com/zokirbek85/lenza_erp.git src
```
Kod endi `/opt/lenza_erp/src` ichiga tushadi.

---

## 7. Python virtual environment va backend o'rnatish
```bash
cd /opt/lenza_erp/src/backend
python3 -m venv /opt/lenza_erp/venv
source /opt/lenza_erp/venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

---

## 8. Backend `.env` faylini yaratish
`/opt/lenza_erp/src/backend/.env` fayliga quyidagilarni yozing (namuna):
```
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=ozing_tasodifiy_uzun_maxfiy_key
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost,45.138.159.195,erp.lenza.uz

USE_POSTGRES=True
POSTGRES_DB=lenza_erp
POSTGRES_USER=lenza_user
POSTGRES_PASSWORD=STRONG_PASSWORD_HERE
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
CHANNEL_LAYER_BACKEND=channels.layers.InMemoryChannelLayer

JWT_ACCESS_LIFETIME=30
JWT_REFRESH_LIFETIME=1440

TELEGRAM_BOT_TOKEN=BU_YERGA_BOTFATHER_BERGAN_TOKEN
TELEGRAM_GROUP_CHAT_ID=-1003006758530
TELEGRAM_CHAT_ID=-1003006758530

COMPANY_NAME=Lenza ERP
COMPANY_SLOGAN="Precision in Every Door"
COMPANY_ADDRESS="Farg'ona, O'zbekiston"
COMPANY_PHONE="+998 90 123 45 67"
```
- `DJANGO_DEBUG` productionda albatta `False`.
- Parollar va tokenlarni real qiymatlarga almashtiring.
- Zarur bo'lsa qo'shimcha konfiguratsiyalarni qo'shing (SMTP va h.k.).

---

## 9. Django migratsiyalar va statik fayllar
```bash
cd /opt/lenza_erp/src/backend
source /opt/lenza_erp/venv/bin/activate
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
```
- `createsuperuser` paytida admin login/parolini kiritasiz — bu ma'lumotlarni xavfsiz saqlang.

---

## 10. Gunicorn + systemd servisi
`/etc/systemd/system/lenza_erp.service` faylini yarating:
```
[Unit]
Description=Lenza ERP Django Service
After=network.target

[Service]
User=root
Group=www-data
WorkingDirectory=/opt/lenza_erp/src/backend
Environment="DJANGO_SETTINGS_MODULE=core.settings"
Environment="PYTHONUNBUFFERED=1"
EnvironmentFile=/opt/lenza_erp/src/backend/.env
ExecStart=/opt/lenza_erp/venv/bin/gunicorn core.wsgi:application \
  --bind 127.0.0.1:8000 \
  --workers 4

Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```
So'ng:
```bash
systemctl daemon-reload
systemctl enable lenza_erp
systemctl start lenza_erp
systemctl status lenza_erp
```
`status` buyruq servisingiz ishlayotganini ko'rsatadi (journal loglarini ham tekshirish mumkin).

---

## 11. Frontend build (Vite + React)
1. `.env` fayli (`/opt/lenza_erp/src/frontend/.env`) ni yarating:
   ```
   VITE_API_URL=https://erp.lenza.uz
   VITE_WS_URL=wss://erp.lenza.uz
   VITE_DISABLE_SW=true
   ```
2. Build qilish:
   ```bash
   cd /opt/lenza_erp/src/frontend
   npm install
   npm run build
   ```
3. Build natijasi `/opt/lenza_erp/src/frontend/dist` papkasiga yoziladi.

---

## 12. Nginx konfiguratsiyasi
`/etc/nginx/sites-available/lenza_erp` fayli:
```
server {
    listen 80;
    server_name erp.lenza.uz 45.138.159.195;

    root /opt/lenza_erp/src/frontend/dist;
    index index.html;

    location /static/ {
        alias /opt/lenza_erp/src/backend/staticfiles/;
    }

    location /media/ {
        alias /opt/lenza_erp/src/backend/media/;
    }

    location ^~ /admin/ {
        proxy_pass http://127.0.0.1:8000/admin/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location ^~ /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```
Faollashtirish:
```bash
ln -s /etc/nginx/sites-available/lenza_erp /etc/nginx/sites-enabled/lenza_erp
nginx -t
systemctl restart nginx
```
So'ng brauzerda `https://erp.lenza.uz` va `https://erp.lenza.uz/admin/` ni tekshiring.

---

## 13. Telegram bot (ixtiyoriy)
Agar `manage.py runbot` ishlatilsa, alohida servis yarating:
`/etc/systemd/system/lenza_erp_bot.service`
```
[Unit]
Description=Lenza ERP Telegram Bot
After=network.target

[Service]
User=root
WorkingDirectory=/opt/lenza_erp/src/backend
EnvironmentFile=/opt/lenza_erp/src/backend/.env
ExecStart=/opt/lenza_erp/venv/bin/python manage.py runbot
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```
Keyin:
```bash
systemctl daemon-reload
systemctl enable lenza_erp_bot
systemctl start lenza_erp_bot
systemctl status lenza_erp_bot
```

---

## 14. Yangilash (GitHub'dan)
Kelajakda kodni yangilash uchun:
```bash
cd /opt/lenza_erp/src
git pull origin main

cd backend
source /opt/lenza_erp/venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput

cd ../frontend
npm install
npm run build

systemctl restart lenza_erp
systemctl restart lenza_erp_bot   # agar mavjud bo'lsa
```
> **Muhim**: bu jarayonda PostgreSQL bazasini o'chirmang — faqat migratsiyalar ishlatiladi.

---

## 15. Yakuniy tekshiruv
- `systemctl status lenza_erp` → **active (running)**.
- `systemctl status nginx` → **active (running)**.
- Brauzerda `erp.lenza.uz` → frontend ochiladi.
- `erp.lenza.uz/admin/` → superuser bilan kirish mumkin.
- Agar bot ishlatilsa: `systemctl status lenza_erp_bot`.

Shu bilan deploy yakunlandi. Hozirgi konfiguratsiya kelajakda `scripts/update_from_git.sh` orqali xavfsiz yangilanadi. Muammolar bo'lsa, `journalctl -u <service> -f` loglarini tekshiring.

