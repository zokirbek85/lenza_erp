# 413 Request Entity Too Large - Yechim

## Muammo

ProductVariant yaratish yoki tahrirlashda rasm yuklashda quyidagi xatolik yuz beradi:

```
413 Request Entity Too Large
nginx/1.24.0 (Ubuntu)
```

Bu xatolik yuklangan rasm hajmi nginx serverining ruxsat etilgan maksimal hajmidan oshib ketganida yuzaga keladi.

## Sabab

Nginx default sozlamalarida `client_max_body_size` juda kichik qiymatga sozlangan (masalan, 1-2MB). Zamonaviy kamera rasmlari odatda 5-10MB yoki undan katta bo'lishi mumkin.

## Yechim

### 1. Django Backend Settings (Bajarildi ✅)

`backend/core/settings.py` fayliga file upload limitlar qo'shildi:

```python
# File Upload Settings
# Maximum size of request body (in bytes): 50MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 52428800  # 50MB
# Maximum size of uploaded file (in bytes): 50MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 52428800  # 50MB
```

### 2. Nginx Configuration (Bajarildi ✅)

Barcha nginx konfiguratsiyalarida `client_max_body_size` 100MB ga oshirildi:

**Fayllar yangilandi:**
- `nginx/erp.lenza.uz` - Local development
- `deploy/nginx/erp.lenza.uz.conf` - Production deployment

**O'zgartirish:**
```nginx
# Eski
client_max_body_size 50M;

# Yangi
client_max_body_size 100M;
```

### 3. Production Server'da Qo'llash

Production serverda o'zgarishlarni qo'llash uchun:

#### Option 1: Avtomatik script (Tavsiya etiladi)

```bash
# Skriptga ruxsat berish
chmod +x fix_413_error.sh

# Skriptni ishga tushirish
sudo ./fix_413_error.sh
```

#### Option 2: Qo'lda qo'llash

```bash
# 1. Kodni yangilash
cd /opt/lenza_erp
git pull origin main

# 2. Nginx konfiguratsiyasini yangilash
sudo cp deploy/nginx/erp.lenza.uz.conf /etc/nginx/sites-available/erp.lenza.uz

# 3. Nginx konfiguratsiyasini tekshirish
sudo nginx -t

# 4. Nginx'ni qayta yuklash
sudo systemctl reload nginx

# 5. Docker containerlarni qayta ishga tushirish (agar kerak bo'lsa)
cd /opt/lenza_erp
bash update.sh
```

## Tekshirish

### Backend limitini tekshirish

```python
# Django shell
python manage.py shell

from django.conf import settings
print(f"DATA_UPLOAD_MAX_MEMORY_SIZE: {settings.DATA_UPLOAD_MAX_MEMORY_SIZE / 1024 / 1024}MB")
print(f"FILE_UPLOAD_MAX_MEMORY_SIZE: {settings.FILE_UPLOAD_MAX_MEMORY_SIZE / 1024 / 1024}MB")
```

### Nginx konfiguratsiyasini tekshirish

```bash
# Production serverda
sudo nginx -t
sudo nginx -T | grep client_max_body_size
```

Natija:
```
client_max_body_size 100M;
```

### Frontend'dan test qilish

1. Admin panel: http://erp.lenza.uz/admin/catalog/productvariant/add/
2. Katta rasm (5-10MB) yuklash
3. Save tugmasini bosish
4. Xatolik bo'lmasligi kerak ✅

## Qo'shimcha Tavsiyalar

### Rasm optimizatsiyasi

Frontend'da rasm yuklashdan oldin optimizatsiya qilish:

```typescript
// frontend/src/utils/imageOptimizer.ts
export const optimizeImage = async (file: File, maxSizeMB: number = 5): Promise<File> => {
  if (file.size <= maxSizeMB * 1024 * 1024) {
    return file; // Already small enough
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        // Calculate new dimensions (max 1920x1920)
        let width = img.width;
        let height = img.height;
        const maxDimension = 1920;
        
        if (width > height && width > maxDimension) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            resolve(new File([blob!], file.name, { type: 'image/jpeg' }));
          },
          'image/jpeg',
          0.85 // Quality
        );
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
};
```

### Progressiv yuklash

Katta fayllar uchun progress bar ko'rsatish:

```typescript
// frontend/src/components/ImageUpload.tsx
import { Upload, message, Progress } from 'antd';
import type { UploadProps } from 'antd';

const ImageUploadWithProgress: React.FC = () => {
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadProps: UploadProps = {
    customRequest: async ({ file, onSuccess, onError, onProgress }) => {
      const formData = new FormData();
      formData.append('image', file);

      try {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(percent);
            onProgress?.({ percent });
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            onSuccess?.(xhr.response);
            message.success('Rasm muvaffaqiyatli yuklandi!');
          } else {
            onError?.(new Error(xhr.statusText));
            message.error('Xatolik yuz berdi');
          }
        });

        xhr.open('POST', '/api/upload/image/');
        xhr.send(formData);
      } catch (error) {
        onError?.(error as Error);
      }
    },
  };

  return (
    <div>
      <Upload {...uploadProps}>
        <Button icon={<UploadOutlined />}>Rasm yuklash</Button>
      </Upload>
      {uploadProgress > 0 && uploadProgress < 100 && (
        <Progress percent={uploadProgress} />
      )}
    </div>
  );
};
```

## Xulosa

✅ **Django**: 50MB limit qo'shildi  
✅ **Nginx**: 100MB limit qo'shildi  
✅ **Production script**: Avtomatik yangilash skripti yaratildi  

Endi ProductVariant yaratishda 100MB gacha rasm yuklash mumkin!

## Qo'shimcha Resurslar

- [Django File Upload Settings](https://docs.djangoproject.com/en/5.1/ref/settings/#file-upload-max-memory-size)
- [Nginx client_max_body_size](https://nginx.org/en/docs/http/ngx_http_core_module.html#client_max_body_size)
- [Image Optimization Best Practices](https://web.dev/fast/#optimize-your-images)
