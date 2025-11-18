import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / '.env'
PROD_ENV_FILE = BASE_DIR / '.env.production'

if ENV_FILE.exists():
    load_dotenv(ENV_FILE, override=False)

debug_flag = os.getenv('DJANGO_DEBUG', os.getenv('DEBUG', 'true')).lower() == 'true'
if not debug_flag and PROD_ENV_FILE.exists():
    load_dotenv(PROD_ENV_FILE, override=True)
elif debug_flag and ENV_FILE.exists():
    load_dotenv(ENV_FILE, override=True)

DEBUG = debug_flag
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'lenza-erp-dev-secret')
ALLOWED_HOSTS = [host.strip() for host in os.getenv('DJANGO_ALLOWED_HOSTS', '127.0.0.1,localhost').split(',') if host.strip()]
CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in os.getenv('DJANGO_CSRF_TRUSTED_ORIGINS', '').split(',') if origin.strip()]

INSTALLED_APPS = [
    'core.apps.CoreConfig',
    'bot.apps.BotConfig',
    'telegram_bot.apps.TelegramBotConfig',
    'whitenoise.runserver_nostatic',
    'corsheaders',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'rest_framework.authtoken',
    'django_filters',
    'users',
    'dealers',
    'catalog',
    'orders.apps.OrdersConfig',
    'inventory.apps.InventoryConfig',
    'payments.apps.PaymentsConfig',
    'expenses.apps.ExpensesConfig',
    'ledger.apps.LedgerConfig',
    'kpis',
    'notifications.apps.NotificationsConfig',
    'returns.apps.ReturnsConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'core.middleware.AuditMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'
ASGI_APPLICATION = 'core.asgi.application'

USE_POSTGRES = os.getenv('USE_POSTGRES', 'true' if not DEBUG else 'false').lower() == 'true'

if USE_POSTGRES:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('POSTGRES_DB', 'lenza_erp'),
            'USER': os.getenv('POSTGRES_USER', 'admin'),
            'PASSWORD': os.getenv('POSTGRES_PASSWORD', 'maxdoors123'),
            'HOST': os.getenv('POSTGRES_HOST', 'localhost'),
            'PORT': os.getenv('POSTGRES_PORT', '5432'),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Tashkent'
USE_I18N = True
USE_TZ = True

STATIC_URL = os.getenv('STATIC_URL', '/static/')
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_ROOT = Path(os.getenv('STATIC_ROOT', str(BASE_DIR / 'staticfiles')))
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = os.getenv('MEDIA_URL', '/media/')
MEDIA_ROOT = Path(os.getenv('MEDIA_ROOT', str(BASE_DIR / 'media')))

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

DEFAULT_CHARSET = 'utf-8'
DEFAULT_CONTENT_TYPE = 'text/html'

REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 25,
    'PAGE_SIZE_QUERY_PARAM': 'page_size',
    'MAX_PAGE_SIZE': 200,
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.AnonRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'anon': os.getenv('DRF_ANON_THROTTLE', '200/day'),
    },
}

JWT_ACCESS_MINUTES = int(os.getenv('JWT_ACCESS_LIFETIME', os.getenv('JWT_ACCESS_MINUTES', 30)))
JWT_REFRESH_MINUTES = int(os.getenv('JWT_REFRESH_LIFETIME', os.getenv('JWT_REFRESH_MINUTES', 1440)))
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=JWT_ACCESS_MINUTES),
    'REFRESH_TOKEN_LIFETIME': timedelta(minutes=JWT_REFRESH_MINUTES),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

AUTH_USER_MODEL = 'users.User'

EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
    },
}

TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', os.getenv('TELEGRAM_TOKEN'))
TELEGRAM_GROUP_CHAT_ID = os.getenv('TELEGRAM_GROUP_CHAT_ID', os.getenv('TELEGRAM_CHAT_ID'))

COMPANY_NAME = os.getenv('COMPANY_NAME', 'Lenza ERP')
COMPANY_SLOGAN = os.getenv('COMPANY_SLOGAN', '')
COMPANY_ADDRESS = os.getenv("COMPANY_ADDRESS", '')
COMPANY_PHONE = os.getenv('COMPANY_PHONE', '')

REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = os.getenv('REDIS_PORT', '6379')
REDIS_DB = os.getenv('REDIS_DB', '0')
REDIS_URL = os.getenv('REDIS_URL', f'redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}')
CHANNEL_LAYER_BACKEND = os.getenv('CHANNEL_LAYER_BACKEND', 'channels.layers.InMemoryChannelLayer')

if CHANNEL_LAYER_BACKEND == 'channels_redis.core.RedisChannelLayer':
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': CHANNEL_LAYER_BACKEND,
            'CONFIG': {
                'hosts': [REDIS_URL],
            },
        }
    }
else:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': CHANNEL_LAYER_BACKEND,
        }
    }

cors_allowed_origins = os.getenv('DJANGO_CORS_ALLOWED_ORIGINS', '').split(',')
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in cors_allowed_origins if origin.strip()]

if not CORS_ALLOWED_ORIGINS:
    CORS_ALLOW_ALL_ORIGINS = os.getenv('DJANGO_CORS_ALLOW_ALL', 'true').lower() == 'true'
else:
    CORS_ALLOW_ALL_ORIGINS = False

CORS_ALLOW_CREDENTIALS = False
CORS_ALLOW_HEADERS = ['*']
