# VPS Deployment Debug Commands

Backend container restart bo'lyapti. Muammoni aniqlash uchun quyidagi commandlarni ishga tushiring:

## 1. Backend container loglarini ko'rish:
```bash
docker logs lenza_backend_blue --tail 100
```

## 2. Container statusini tekshirish:
```bash
docker ps -a | grep backend_blue
```

## 3. Database migration xatolari:
```bash
docker exec lenza_backend_blue python manage.py migrate --check
```

## 4. Django startup xatolari:
```bash
docker exec lenza_backend_blue python manage.py check
```

## 5. Python import xatolari:
```bash
docker exec lenza_backend_blue python -c "import django; django.setup()"
```

## Ehtimoliy muammolar:

### 1. Migration xatosi
**Sabab:** 0009 migration da qo'lda SQL ishlatilgan, production database bilan mos kelmasligi mumkin.

**Yechim:** Migration ni production uchun to'g'rilash kerak.

### 2. Missing field: description
**Sabab:** ProductVariant va ProductModel da description field modelda yo'q lekin migration yaratishda qolgan.

**Yechim:** Migration faylni to'g'rilash yoki yangi migration yaratish.

### 3. Database connection
**Sabab:** Backend database ga ulanolmayapti.

**Yechim:** DB_HOST, DB_NAME, credentials tekshirish.

## Tezkor yechim (agar migration muammosi bo'lsa):

```bash
# 1. Blue stack ni to'xtatish
docker-compose -f deploy/docker-compose.blue.yml down

# 2. Green stack ni qayta ishga tushirish (eski versiya)
docker-compose -f deploy/docker-compose.green.yml up -d

# 3. Migration ni to'g'rilash (local development)
# Keyin qayta deploy qilish
```

## Keyingi qadamlar:

1. **Backend loglarni ko'ring** va xato xabarini topinglar
2. Xato xabarini shu yerga yuboring - to'g'rilayman
3. Yangi fix commitlayman
4. Qayta deploy qilasiz
