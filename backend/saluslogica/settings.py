import os
from pathlib import Path
from celery import Celery
from decouple import config, Csv
import dj_database_url

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY', default='django-insecure-your-secret-key-here-change-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1,0.0.0.0,testserver', cast=Csv())

# Application definition
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'django_filters',
    'storages',  # AWS S3 storage
]

LOCAL_APPS = [
    'apps.authentication',
    'apps.medicines',
    'apps.doses',
    'apps.notifications',
    'apps.analytics',
    'apps.interactions',
    'apps.alarms',
    'saluslogica',  # Add the pharmacy admin app
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'saluslogica.middleware.RequestTimingMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Frontend URL (used in verification/password-reset emails)
# NEVER accept this from client requests — it must be server-configured
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:5173')

# CORS settings
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173,http://localhost:8081,http://localhost:8082,http://127.0.0.1:8081,http://127.0.0.1:8082,http://localhost:19006',
    cast=Csv()
)

# Allow all origins in production if specific origins not set properly
# Remove this after testing
CORS_ALLOW_ALL_ORIGINS = config('CORS_ALLOW_ALL_ORIGINS', default=False, cast=bool)

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOWED_METHODS = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
]

CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "accept-language",
    "access-control-request-headers",
    "access-control-request-method",
    "authorization",
    "content-language",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

ROOT_URLCONF = 'saluslogica.urls'

# Template settings (required for Django admin)
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],  # Add global templates directory
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

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# AWS S3 Configuration for Production Media Storage
USE_S3 = config('USE_S3', default=False, cast=bool)

if USE_S3:
    # AWS S3 Settings
    AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME')
    AWS_S3_REGION_NAME = config('AWS_S3_REGION_NAME', default='us-east-1')
    AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
    
    # S3 Object Parameters
    AWS_S3_OBJECT_PARAMETERS = {
        'CacheControl': 'max-age=86400',  # 1 day cache
    }
    
    # S3 File Upload Settings
    AWS_DEFAULT_ACL = 'public-read'
    AWS_S3_FILE_OVERWRITE = False  # Don't overwrite files with same name
    AWS_QUERYSTRING_AUTH = False  # Don't add auth query params to URLs
    
    # Use S3 for media files
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/'
    
    # Security settings
    AWS_S3_SIGNATURE_VERSION = 's3v4'
    AWS_S3_VERIFY = True

WSGI_APPLICATION = 'saluslogica.wsgi.application'

# Database
# Support DATABASE_URL for Docker or fall back to individual settings
DATABASE_URL = config('DATABASE_URL', default=None)

if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.parse(DATABASE_URL)
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': config('DB_ENGINE', default='django.db.backends.postgresql'),
            'NAME': config('DB_NAME', default='saluslogicaDB'),
            'USER': config('DB_USER', default='postgres'),
            'PASSWORD': config('DB_PASSWORD', default=''),
            'HOST': config('DB_HOST', default='localhost'),
            'PORT': config('DB_PORT', default='5432'),
        }
    }

# Password validation
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

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = config('TIME_ZONE', default='UTC')
USE_I18N = True
USE_TZ = True

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'EXCEPTION_HANDLER': 'saluslogica.exception_handlers.custom_exception_handler',
    'DEFAULT_THROTTLE_CLASSES': [
        'saluslogica.throttles.AnonBurstRateThrottle',
        'saluslogica.throttles.AnonSustainedRateThrottle',
        'saluslogica.throttles.UserBurstRateThrottle',
        'saluslogica.throttles.UserSustainedRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon_burst': config('ANON_BURST_RATE', default='20/min'),
        'anon_sustained': config('ANON_SUSTAINED_RATE', default='100/hour'),
        'user_burst': config('USER_BURST_RATE', default='60/min'),
        'user_sustained': config('USER_SUSTAINED_RATE', default='1000/hour'),
        'pharmacy_admin': config('PHARMACY_ADMIN_RATE', default='2000/hour'),
        'login': config('LOGIN_RATE', default='5/min'),
        'password_reset': config('PASSWORD_RESET_RATE', default='3/hour'),
        'registration': config('REGISTRATION_RATE', default='3/hour'),
        'medicine_creation': config('MEDICINE_CREATION_RATE', default='30/hour'),
        'notification': config('NOTIFICATION_RATE', default='100/hour'),
        'upload': config('UPLOAD_RATE', default='20/hour'),
    },
}

# Celery Configuration
CELERY_BROKER_URL = config('CELERY_BROKER_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = config('CELERY_RESULT_BACKEND', default='redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# Firebase Cloud Messaging (FCM) configuration
# Path to the Firebase service account JSON key file.
# Download from: Firebase Console → Project Settings → Service Accounts → Generate new private key
# Set via environment variable: FCM_SERVICE_ACCOUNT_FILE=/path/to/firebase-service-account.json
FCM_SERVICE_ACCOUNT_FILE = config('FCM_SERVICE_ACCOUNT_FILE', default='')

# Celery beat schedule for periodic tasks
CELERY_BEAT_SCHEDULE = {
    'check-missed-doses': {
        'task': 'apps.doses.tasks.check_missed_doses',
        'schedule': 300.0,  # Every 5 minutes
    },
    'send-dose-reminders': {
        'task': 'apps.doses.tasks.send_dose_reminders',
        'schedule': 60.0,  # Every minute
    },
    'cleanup-old-notifications': {
        'task': 'apps.notifications.tasks.cleanup_old_notifications',
        'schedule': 3600.0,  # Every hour
    },
    # New alarm system tasks
    'check-medication-schedules': {
        'task': 'apps.alarms.tasks.check_medication_schedules',
        'schedule': 60.0,  # Every minute - check for upcoming doses
    },
    'repeat-unacknowledged-alarms': {
        'task': 'apps.alarms.tasks.repeat_unacknowledged_alarms',
        'schedule': 10.0,  # Every 10 seconds - repeat unacknowledged alarms
    },
    'generate-daily-schedules': {
        'task': 'apps.alarms.tasks.generate_daily_schedules',
        'schedule': 86400.0,  # Daily at midnight - generate schedules for the day
    },
    'cleanup-old-schedules': {
        'task': 'apps.alarms.tasks.cleanup_old_schedules',
        'schedule': 86400.0,  # Daily - cleanup old data
    },
}

# Custom User Model
AUTH_USER_MODEL = 'authentication.User'

# Email configuration (for notifications)
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@saluslogica.com')
SERVER_EMAIL = config('SERVER_EMAIL', default=DEFAULT_FROM_EMAIL)
EMAIL_HOST = config('EMAIL_HOST', default='')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_USE_SSL = config('EMAIL_USE_SSL', default=False, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')

# Print email settings for debugging (remove in production)
import logging
logger = logging.getLogger(__name__)
logger.info(f"EMAIL_BACKEND: {EMAIL_BACKEND}")
logger.info(f"EMAIL_HOST: {EMAIL_HOST}")
logger.info(f"DEFAULT_FROM_EMAIL: {DEFAULT_FROM_EMAIL}")

# Logging
LOG_LEVEL = config('LOG_LEVEL', default='INFO')
LOG_FILE = config('LOG_FILE', default='logs/django.log')

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': LOG_LEVEL,
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'level': LOG_LEVEL,
            'class': 'logging.FileHandler',
            'filename': LOG_FILE,
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': LOG_LEVEL,
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': LOG_LEVEL,
            'propagate': False,
        },
    },
}

# Threshold (in milliseconds) for logging slow requests
SLOW_REQUEST_THRESHOLD_MS = config('SLOW_REQUEST_THRESHOLD_MS', default=500, cast=int)

# Security settings for production
if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = config('SECURE_BROWSER_XSS_FILTER', default=True, cast=bool)
    SECURE_CONTENT_TYPE_NOSNIFF = config('SECURE_CONTENT_TYPE_NOSNIFF', default=True, cast=bool)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = config('SECURE_HSTS_INCLUDE_SUBDOMAINS', default=True, cast=bool)
    SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=31536000, cast=int)
    SECURE_HSTS_PRELOAD = config('SECURE_HSTS_PRELOAD', default=False, cast=bool)
    SECURE_REDIRECT_EXEMPT = []
    SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=True, cast=bool)
    SESSION_COOKIE_SECURE = config('SESSION_COOKIE_SECURE', default=True, cast=bool)
    CSRF_COOKIE_SECURE = config('CSRF_COOKIE_SECURE', default=True, cast=bool)
