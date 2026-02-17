# Environment Variables Setup Guide

## Overview

All sensitive configuration values have been moved from `settings.py` to environment variables for better security and flexibility. This follows the [12-Factor App](https://12factor.net/config) methodology.

## Quick Start

### 1. Create your `.env` file

```bash
cd backend
cp .env.example .env
```

The `.env` file has been created with development defaults. **Never commit this file to Git!**

### 2. Update SECRET_KEY (Important!)

Generate a new secure secret key for production:

```python
# Run in Python shell
from django.core.management.utils import get_random_secret_key
print(get_random_secret_key())
```

Update your `.env` file:
```bash
SECRET_KEY=your-newly-generated-secret-key-here
```

### 3. Configure for your environment

Edit `.env` and update values as needed for your setup.

## Environment Variables Reference

### Django Core Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `DEBUG` | `True` | Enable debug mode (set to `False` in production) |
| `SECRET_KEY` | (dev key) | Django secret key for cryptographic signing |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1,...` | Comma-separated list of allowed hosts |
| `TIME_ZONE` | `UTC` | Server timezone (e.g., `Africa/Kigali`) |

### Database Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_ENGINE` | `django.db.backends.sqlite3` | Database backend |
| `DATABASE_NAME` | `db.sqlite3` | Database name or file path |
| `DATABASE_USER` | (empty) | Database username |
| `DATABASE_PASSWORD` | (empty) | Database password |
| `DATABASE_HOST` | (empty) | Database host |
| `DATABASE_PORT` | (empty) | Database port |

**Example PostgreSQL configuration:**
```bash
DATABASE_ENGINE=django.db.backends.postgresql
DATABASE_NAME=saluslogica
DATABASE_USER=postgres
DATABASE_PASSWORD=your_secure_password
DATABASE_HOST=localhost
DATABASE_PORT=5432
```

### Redis & Celery Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `CELERY_BROKER_URL` | `redis://localhost:6379/0` | Message broker URL |
| `CELERY_RESULT_BACKEND` | `redis://localhost:6379/0` | Result backend URL |

### Email Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `EMAIL_BACKEND` | `console.EmailBackend` | Email backend to use |
| `DEFAULT_FROM_EMAIL` | `noreply@saluslogica.com` | Default sender email |
| `EMAIL_HOST` | (empty) | SMTP server hostname |
| `EMAIL_PORT` | `587` | SMTP server port |
| `EMAIL_USE_TLS` | `True` | Use TLS encryption |
| `EMAIL_HOST_USER` | (empty) | SMTP username |
| `EMAIL_HOST_PASSWORD` | (empty) | SMTP password |

**Example Gmail configuration:**
```bash
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

### CORS Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,...` | Comma-separated list of allowed origins |

**Example:**
```bash
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,https://app.saluslogica.com
```

### Logging Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL) |
| `LOG_FILE` | `logs/django.log` | Log file path |

### Security Settings (Production Only)

These settings only apply when `DEBUG=False`:

| Variable | Default | Description |
|----------|---------|-------------|
| `SECURE_SSL_REDIRECT` | `True` | Redirect HTTP to HTTPS |
| `SECURE_HSTS_SECONDS` | `31536000` | HSTS max age (1 year) |
| `SECURE_HSTS_INCLUDE_SUBDOMAINS` | `True` | Apply HSTS to subdomains |
| `SECURE_BROWSER_XSS_FILTER` | `True` | Enable XSS filtering |
| `SECURE_CONTENT_TYPE_NOSNIFF` | `True` | Prevent MIME type sniffing |
| `SESSION_COOKIE_SECURE` | `True` | Require HTTPS for session cookies |
| `CSRF_COOKIE_SECURE` | `True` | Require HTTPS for CSRF cookies |

## Different Environments

### Development

Use the default `.env` file created from `.env.example`:

```bash
DEBUG=True
SECRET_KEY=django-insecure-dev-key-...
DATABASE_ENGINE=django.db.backends.sqlite3
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

### Production

Create a production `.env` with:

```bash
DEBUG=False
SECRET_KEY=<strong-random-secret-key>
ALLOWED_HOSTS=your-domain.com,api.your-domain.com

# PostgreSQL
DATABASE_ENGINE=django.db.backends.postgresql
DATABASE_NAME=saluslogica_prod
DATABASE_USER=saluslogica_user
DATABASE_PASSWORD=<strong-password>
DATABASE_HOST=db.internal
DATABASE_PORT=5432

# Production Redis
CELERY_BROKER_URL=redis://redis.internal:6379/0
CELERY_RESULT_BACKEND=redis://redis.internal:6379/0

# Real email
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=<sendgrid-api-key>

# Production CORS
CORS_ALLOWED_ORIGINS=https://app.saluslogica.com,https://www.saluslogica.com

# Security (automatically applied when DEBUG=False)
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
```

### Testing

Create a `.env.test` for CI/CD:

```bash
DEBUG=True
SECRET_KEY=test-secret-key-for-ci
DATABASE_ENGINE=django.db.backends.sqlite3
DATABASE_NAME=:memory:
EMAIL_BACKEND=django.core.mail.backends.locmem.EmailBackend
```

## Docker Deployment

When using Docker, you can pass environment variables via:

### docker-compose.yml
```yaml
services:
  web:
    env_file:
      - .env
    # OR
    environment:
      - DEBUG=False
      - SECRET_KEY=${SECRET_KEY}
      - DATABASE_HOST=db
```

### Docker run
```bash
docker run --env-file .env your-image
```

## Best Practices

### ✅ DO:
- Keep `.env` file private and never commit it
- Use strong, randomly generated SECRET_KEY in production
- Set `DEBUG=False` in production
- Use environment-specific `.env` files
- Rotate secrets regularly
- Use different SECRET_KEY for each environment

### ❌ DON'T:
- Commit `.env` to version control
- Use default/example values in production
- Share `.env` files via email or messaging
- Hardcode secrets in settings.py
- Use DEBUG=True in production

## Troubleshooting

### "Settings cannot be configured" error
Make sure your `.env` file exists in the backend directory.

### Variables not loading
1. Check `.env` file is in the same directory as `manage.py`
2. Verify no syntax errors in `.env` (no quotes needed for values)
3. Restart Django development server after changing `.env`

### Import error for `decouple`
Install python-decouple:
```bash
pip install python-decouple
```

## Verification

Test your configuration:

```bash
cd backend
python manage.py check
python manage.py showmigrations
python manage.py test
```

Check environment variables are loaded:

```python
# In Django shell
python manage.py shell

>>> from django.conf import settings
>>> print(settings.DEBUG)
>>> print(settings.SECRET_KEY[:10] + '...')  # First 10 chars only
>>> print(settings.DATABASES['default']['ENGINE'])
```

## Migration from Old Setup

If upgrading from hardcoded settings.py:

1. ✅ `.env` file created - settings now read from environment
2. ✅ `.env.example` updated - template for new developers
3. ✅ `.gitignore` updated - prevents committing secrets
4. ✅ `settings.py` updated - uses `python-decouple`

Your existing setup will continue to work with the default values!

## Additional Resources

- [Python Decouple Documentation](https://github.com/henriquebastos/python-decouple)
- [Django Security Best Practices](https://docs.djangoproject.com/en/4.2/topics/security/)
- [12-Factor App Config](https://12factor.net/config)
