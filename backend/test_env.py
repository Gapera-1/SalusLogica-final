#!/usr/bin/env python
"""Test script to verify environment variables are loaded correctly"""

import os
import django

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saluslogica.settings')
django.setup()

from django.conf import settings

print("=" * 60)
print("Environment Variables Test")
print("=" * 60)
print(f"DEBUG: {settings.DEBUG}")
print(f"SECRET_KEY: {settings.SECRET_KEY[:25]}...")
print(f"ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}")
print(f"DATABASE ENGINE: {settings.DATABASES['default']['ENGINE']}")
print(f"DATABASE NAME: {settings.DATABASES['default']['NAME']}")
print(f"CELERY_BROKER_URL: {settings.CELERY_BROKER_URL}")
print(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
print(f"TIME_ZONE: {settings.TIME_ZONE}")
print(f"CORS_ALLOWED_ORIGINS: {len(settings.CORS_ALLOWED_ORIGINS)} origins configured")
print("=" * 60)
print("✅ Environment variables loaded successfully!")
print("=" * 60)
