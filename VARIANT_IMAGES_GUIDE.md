# Product Variant Images Guide

## Problem
Katalog sahifasida variant rasmlar 404 xato bermoqda:
```
GET https://erp.lenza.uz/media/catalog/variants/97160675.png.webp 404 (Not Found)
```

## Root Cause
ProductVariant modelida `image` maydoni mavjud, lekin rasmlar hali yuklanmagan.

## Solution

### 1. Django Admin orqali rasm yuklash

#### A. Bitta variant uchun:
1. Django admin'ga kiring: `https://erp.lenza.uz/admin/`
2. **Catalog** > **Product Variants** ga o'ting
3. Tahrirlash kerak bo'lgan variant'ni tanlang
4. **Variant Details** bo'limida **Image** maydonini toping
5. "Choose File" tugmasini bosing va rasm tanlang
6. **Save** tugmasini bosing

#### B. Ko'p variantlar uchun (mass upload):
```python
# Django shell orqali
python manage.py shell

from catalog.models import ProductVariant
from django.core.files import File

# Example: Upload image for specific variant
variant = ProductVariant.objects.get(id=1)
with open('/path/to/image.jpg', 'rb') as f:
    variant.image.save('variant_image.jpg', File(f), save=True)
```

### 2. Rasm formatlar va talablar

**Tavsiya etiladigan format:**
- Format: PNG, JPG, WEBP
- O'lcham: 800x600px (aspect ratio 4:3)
- Fayl hajmi: < 500KB
- Path: `media/catalog/variants/`

**Fayl nomlash konvensiyasi:**
```
{model_name}-{color}-{door_type}.jpg
Misol: Beta-Soft-tach-seriy-PG.jpg
```

### 3. Bulk image upload script

Agar bir nechta rasmlar mavjud bo'lsa, quyidagi script bilan yuklash mumkin:

```python
# backend/upload_variant_images.py
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from catalog.models import ProductVariant
from django.core.files import File

# Rasmlar papkasi
IMAGES_DIR = '/path/to/images/'

# Mapping: variant_id -> image_filename
IMAGE_MAP = {
    1: '97160675.png',
    2: 'PDG-50001_Barhat-white.jpg',
    3: 'PDG-50002_Barhat-white.jpg',
    # ... qo'shimcha variantlar
}

for variant_id, filename in IMAGE_MAP.items():
    try:
        variant = ProductVariant.objects.get(id=variant_id)
        image_path = os.path.join(IMAGES_DIR, filename)
        
        if os.path.exists(image_path):
            with open(image_path, 'rb') as f:
                # Convert to optimized format if needed
                variant.image.save(filename, File(f), save=True)
            print(f"✅ Uploaded image for variant {variant_id}: {filename}")
        else:
            print(f"⚠️  Image not found: {image_path}")
    except ProductVariant.DoesNotExist:
        print(f"❌ Variant {variant_id} not found")
    except Exception as e:
        print(f"❌ Error uploading {filename}: {e}")

print("\n✅ Bulk upload complete!")
```

### 4. Deploy rasmlar

Agar rasmlar lokal mavjud bo'lsa, VPS'ga ko'chirish:

```bash
# From local machine
scp -r backend/media/catalog/variants/ user@erp.lenza.uz:/opt/lenza_erp/backend/media/catalog/

# Or using rsync
rsync -avz backend/media/catalog/variants/ user@erp.lenza.uz:/opt/lenza_erp/backend/media/catalog/variants/
```

### 5. Fallback behavior

Agar rasm mavjud bo'lmasa:
- ✅ **Backend**: `image: null` qaytaradi (404 xato yo'q)
- ✅ **Frontend**: Placeholder icon ko'rsatadi (AppstoreOutlined)

### 6. Image optimization (optional)

Rasm hajmini kamaytirish uchun:

```bash
# Install Pillow (Django default)
pip install Pillow

# Or use external tools
# ImageMagick
convert input.jpg -resize 800x600 -quality 85 output.jpg

# WebP conversion
cwebp input.jpg -q 80 -o output.webp
```

### 7. Current fix applied

**Commit:** `ac75e05` - Return null for missing variant images

**Changes:**
- `VariantCatalogSerializer.get_image()` now checks file existence
- Returns `None` if file missing (no more 404 URLs)
- Frontend already handles null images with placeholder

## Next Steps

1. **Collect variant images** - Rassomlardan yoki katalogdan
2. **Name files consistently** - Model-Color-Type.jpg
3. **Upload via admin** - Manual yoki script orqali
4. **Deploy to VPS** - `scp` yoki `rsync` bilan
5. **Verify** - Katalog sahifasini tekshiring

## Monitoring

Check image upload status:
```python
from catalog.models import ProductVariant

total = ProductVariant.objects.filter(is_active=True).count()
with_images = ProductVariant.objects.filter(is_active=True, image__isnull=False).count()
without_images = total - with_images

print(f"Total active variants: {total}")
print(f"With images: {with_images} ({with_images/total*100:.1f}%)")
print(f"Without images: {without_images} ({without_images/total*100:.1f}%)")
```

## References

- Django ImageField docs: https://docs.djangoproject.com/en/5.1/ref/models/fields/#imagefield
- Pillow docs: https://pillow.readthedocs.io/
- WebP conversion: https://developers.google.com/speed/webp
