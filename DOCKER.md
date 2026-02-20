# SalusLogica Docker Setup Guide

This guide explains how to run SalusLogica using Docker containers.

## Prerequisites

- Docker Desktop installed ([Download](https://www.docker.com/products/docker-desktop/))
- Docker Compose (included with Docker Desktop)
- At least 4GB of RAM available for Docker

## Quick Start

### 1. Copy Environment File

```bash
cp .env.example .env
```

Edit `.env` and update the values (especially `SECRET_KEY` and `POSTGRES_PASSWORD`).

### 2. Build and Start

```bash
# Build all images
docker-compose build

# Start all services
docker-compose up -d
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api/
- **Admin Panel**: http://localhost:8000/admin/
- **Flower (Celery Monitoring)**: http://localhost:5555

### 4. Create Admin User

```bash
docker-compose exec backend python manage.py createsuperuser
```

## Services

| Service | Description | Port |
|---------|-------------|------|
| `frontend` | React SPA (Nginx) | 3000 |
| `backend` | Django REST API | 8000 |
| `db` | PostgreSQL 15 | 5432 |
| `redis` | Redis (Cache/Celery) | 6379 |
| `celery-worker` | Background task processing | - |
| `celery-beat` | Scheduled tasks | - |
| `flower` | Celery monitoring UI | 5555 |

## Common Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Stop Everything

```bash
# Stop containers (keeps data)
docker-compose down

# Stop and remove all data (clean slate)
docker-compose down -v
```

### Run Django Commands

```bash
# Migrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Django shell
docker-compose exec backend python manage.py shell

# Collect static files
docker-compose exec backend python manage.py collectstatic
```

### Access Container Shell

```bash
docker-compose exec backend bash
docker-compose exec frontend sh
```

### Database Access

```bash
# PostgreSQL shell
docker-compose exec db psql -U postgres -d saluslogica

# Redis CLI
docker-compose exec redis redis-cli
```

## Production Deployment

### 1. Update Environment

Edit `.env` with production values:

```env
DEBUG=0
SECRET_KEY=your-production-secret-key
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
VITE_API_URL=https://your-domain.com/api
CORS_ALLOWED_ORIGINS=https://your-domain.com
```

### 2. Add SSL Certificates

Place your SSL certificates in `nginx/ssl/`:

```
nginx/ssl/fullchain.pem
nginx/ssl/privkey.pem
```

### 3. Deploy with Production Config

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs backend

# Rebuild image
docker-compose build --no-cache backend
```

### Database Connection Issues

```bash
# Check if database is ready
docker-compose exec db pg_isready

# Check database logs
docker-compose logs db
```

### Frontend Not Loading

```bash
# Check nginx logs
docker-compose logs frontend

# Verify API URL
docker-compose exec frontend printenv | grep VITE
```

### Clear Everything and Start Fresh

```bash
# Stop and remove all containers, networks, volumes
docker-compose down -v

# Remove all images
docker rmi $(docker images -q saluslogica*)

# Rebuild and start
docker-compose build --no-cache
docker-compose up -d
```

## Resource Management

### View Resource Usage

```bash
docker stats
```

### Limit Resources (optional)

Add to `docker-compose.yml` under service:

```yaml
deploy:
  resources:
    limits:
      cpus: '1'
      memory: 1G
```

## Data Persistence

All data is stored in Docker volumes:

- `postgres_data` - Database data
- `redis_data` - Redis cache data
- `static_volume` - Django static files
- `media_volume` - Uploaded media files

To backup:

```bash
# Backup database
docker-compose exec db pg_dump -U postgres saluslogica > backup.sql

# Restore database
cat backup.sql | docker-compose exec -T db psql -U postgres saluslogica
```
