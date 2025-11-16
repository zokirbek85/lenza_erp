# Lenza ERP ni VPS ga deploy qilish bo‘yicha qo‘llanma

## Tezkor qisqa versiya
1. `ssh root@45.138.159.195` orqali serverga kiring, tizimni yangilang va kerakli paketlarni o‘rnating.  
2. PostgreSQL’da `lenza_erp` bazasi va foydalanuvchisini yarating.  
3. `/opt/lenza_erp` papkasiga repo’ni klon qiling va Python virtual muhitda backend kutubxonalarini o‘rnating.  
4. `/etc/lenza_erp/.env` faylini to‘ldiring, `python manage.py migrate && collectstatic` bajarib, superuser yarating.  
5. `frontend/` papkasida `npm install && npm run build` qiling.  
6. `daphne` uchun systemd servisi yozib, `nginx` ni React build + Django API uchun sozlang.  
7. `certbot --nginx -d erp.lenza.uz` bilan HTTPS yoqing, `ufw` ni sozlang.  
8. Test qiling (https://erp.lenza.uz), loglarni tekshirib, monitoring/backuplarni ishga tushiring.

---

## 1. Kirish
Lenza ERP — Django REST Framework + Channels backend va React (Vite) frontendan iborat tizim bo‘lib, buyurtmalar, moliyaviy blok va hisobotlarni boshqaradi. Maqsad: loyihani `erp.lenza.uz` domenida production rejimida ishga tushirish.

**Talablar:**
- Ubuntu 22.04 LTS (root yoki sudo huquqli foydalanuvchi).
- Domen A-zapisi 45.138.159.195 ga qaragan bo‘lishi.
- Git repoga kirish, PostgreSQL/Redis xizmatlari (lokal yoki tashqi).

## 2. VPS’ga tayyorgarlik
### Serverga ulanish
```bash
ssh root@45.138.159.195
```

### Tizimni yangilash
```bash
apt update && apt upgrade -y
```

### Kerakli paketlar
```bash
apt install -y git build-essential python3 python3-venv python3-pip \
  nginx ufw curl redis-server postgresql postgresql-contrib
```
Node.js (Vite build uchun) — NodeSource orqali LTS versiyasini o‘rnating:
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt install -y nodejs
```

## 3. Loyiha kodini olish
```bash
mkdir -p /opt/lenza_erp
cd /opt/lenza_erp
git clone https://github.com/zokirbek85/lenza_erp.git .
```
Repo tarkibi:
- `backend/` — Django (Django 5.1.2, DRF, Channels, ASGI `core.asgi`).
- `frontend/` — React + Vite (`npm run build` → `dist/`).
- `.env` lar orqali konfiguratsiya.

## 4. Backendni sozlash
### Python virtualenv
```bash
cd /opt/lenza_erp/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### PostgreSQL bazasi
```bash
sudo -u postgres psql <<'SQL'
CREATE DATABASE lenza_erp;
CREATE USER lenza_erp_user WITH ENCRYPTED PASSWORD 'bu_faqat_namuna';
GRANT ALL PRIVILEGES ON DATABASE lenza_erp TO lenza_erp_user;
SQL
```

### .env (production)
`/etc/lenza_erp/.env` faylini yarating (o‘qish huquqi rootdagina bo‘lsin):
```
DJANGO_SECRET_KEY=generate_a_secure_64_char_key    # Django uchun maxfiy kalit
DJANGO_DEBUG=False                                 # Production rejim
DJANGO_ALLOWED_HOSTS=erp.lenza.uz,127.0.0.1,localhost
USE_POSTGRES=True
POSTGRES_DB=lenza_erp
POSTGRES_USER=lenza_erp_user
POSTGRES_PASSWORD=bu_faqat_namuna
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
CHANNEL_LAYER_BACKEND=channels_redis.core.RedisChannelLayer
STATIC_ROOT=/opt/lenza_erp/backend/staticfiles
MEDIA_ROOT=/opt/lenza_erp/backend/media
TELEGRAM_BOT_TOKEN=telegramdan_olingan_token
TELEGRAM_GROUP_CHAT_ID=-100xxxxxxxxx
```
> Diqqat: parollar namuna sifatida yozildi, real qiymatlar bilan almashtiring.

Backend tayyorgarligi:
```bash
cd /opt/lenza_erp/backend
source venv/bin/activate
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser   # admin kirishi uchun tavsiya etiladi
```

## 5. Frontendni build qilish
```bash
cd /opt/lenza_erp/frontend
npm install        # yoki yarn install
npm run build      # natija frontend/dist/ papkasida
```
React build keyinchalik Nginx orqali servis qilinadi.

## 6. Daphne (ASGI) bilan test
Backend Channels ishlatgani uchun `daphne` tavsiya etiladi (requirements’da mavjud).
```bash
cd /opt/lenza_erp/backend
source venv/bin/activate
daphne -b 127.0.0.1 -p 8000 core.asgi:application
```
Test:
```bash
curl http://127.0.0.1:8000/api/health/   # agar health endpoint bo‘lmasa, asosiy sahifani tekshiring
```
`Ctrl+C` bilan to‘xtating.

## 7. systemd xizmatlari
### Django (Daphne) servisi
`/etc/systemd/system/lenza_erp.service`:
```ini
[Unit]
Description=Lenza ERP (Django + Daphne)
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/lenza_erp/backend
EnvironmentFile=/etc/lenza_erp/.env
ExecStart=/opt/lenza_erp/backend/venv/bin/daphne -b 127.0.0.1 -p 8000 core.asgi:application
Restart=always

[Install]
WantedBy=multi-user.target
```
```bash
systemctl daemon-reload
systemctl enable lenza_erp.service
systemctl start lenza_erp.service
systemctl status lenza_erp.service
```

### (Ixtiyoriy) boshqa servislar
Agar kelajakda Celery, Telegram bot yoki boshqa demonlar kerak bo‘lsa, shunga o‘xshash systemd fayllarini yarating:
- `/etc/systemd/system/celery.service`
- `/etc/systemd/system/celery_beat.service`
- `/etc/systemd/system/telegram_bot.service`

Har birida `ExecStart` ga mos Django buyruqlarini yozing va `systemctl enable/start` qiling.

## 8. Nginx konfiguratsiyasi
`/etc/nginx/sites-available/erp.lenza.uz`:
```nginx
server {
    listen 80;
    server_name erp.lenza.uz;

    root /opt/lenza_erp/frontend/dist;
    index index.html;

    location /static/ {
        alias /opt/lenza_erp/backend/staticfiles/;
    }

    location /media/ {
        alias /opt/lenza_erp/backend/media/;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri /index.html;
    }
}
```
Faollashtirish:
```bash
ln -s /etc/nginx/sites-available/erp.lenza.uz /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## 9. HTTPS (Let’s Encrypt / Certbot)
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d erp.lenza.uz
systemctl status certbot.timer    # auto-renew tekshirish
```
> Diqqat: Certbot server block’ni 443 portga moslashtiradi; agar kerak bo‘lsa, 80 → 443 redirectini tekshiring.

## 10. Firewall (UFW)
```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status
```

## 11. Test qilish
1. Brauzerda `https://erp.lenza.uz` ni oching.  
2. `/admin` sahifasiga superuser bilan kiring.  
3. React → Django API bog‘lanishini tekshiring (login, buyurtma ro‘yxati va h.k.).  
4. Loglarni ko‘ring:
```bash
journalctl -u lenza_erp.service -f
tail -f /var/log/nginx/error.log
```

## 12. Loyihani yangilash
```bash
ssh root@45.138.159.195
cd /opt/lenza_erp
systemctl stop lenza_erp.service
git pull origin main
source backend/venv/bin/activate
pip install -r backend/requirements.txt
(cd backend && python manage.py migrate && python manage.py collectstatic --noinput)
(cd frontend && npm install && npm run build)
systemctl start lenza_erp.service
systemctl reload nginx
```
> Maslahat: agar servislar ko‘p bo‘lsa (celery va boshqalar), ularni ham qayta ishga tushiring.

## 13. Troubleshooting
- **nginx: [emerg]** — `nginx -t` bilan sintaksisni tekshiring.  
- **ModuleNotFoundError** — virtualenv aktiv emas yoki `pip install -r requirements.txt` bajarilmagan.  
- **502 Bad Gateway** — `lenza_erp.service` ishlayaptimi? `journalctl -u lenza_erp.service -f` ni tekshiring.  
- **Static ko‘rinmaydi** — `collectstatic` fayllari va Nginx `alias`larini ko‘rib chiqing.  
- **DB ulanish xatosi** — `.env` dagi parametrlar, PostgreSQL ruxsatlari (`pg_hba.conf`) va servis holatini tekshiring.  
- **Redis/Channels muammolari** — `redis-server` ishga tushganini, `.env` dagi `CHANNEL_LAYER_BACKEND` va host/port mosligini tekshiring.  

---

✅ **Yakuniy tekshiruv**  
- Domen DNS → IP mos.  
- HTTPS sertifikat o‘rnatilgan, `https://erp.lenza.uz` ishlaydi.  
- Admin panel, login, buyurtmalar, kassa va eksport funksiyalari testdan o‘tgan.  
- Telegram bildirishnomalari (agar sozlangan bo‘lsa) kelmoqda.  
- Zaxira (pg_dump, media, `.env`) va monitoring (loglar, alertlar) yoniq.  

> 💡 Qo‘shimcha xavfsizlik uchun fail2ban, logrotate va monitoring (Grafana/Prometheus yoki third-party) ni ulash tavsiya etiladi.
