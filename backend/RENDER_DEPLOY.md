# Deploy SalusLogica Backend to Render

## Prerequisites

1. Create a [Render](https://render.com) account
2. Connect your GitHub/GitLab repository to Render

## Deployment Steps

### Option 1: Using render.yaml (Blueprint)

1. Push the `render.yaml` file to your repository root
2. Go to Render Dashboard → "Blueprints"
3. Click "New Blueprint Instance"
4. Select your repository
5. Render will automatically create:
   - PostgreSQL database
   - Redis instance
   - Web service (Django backend)
   - Celery worker
   - Celery beat scheduler

### Option 2: Manual Setup

#### 1. Create PostgreSQL Database
- Go to Render Dashboard → "New" → "PostgreSQL"
- Name: `saluslogica-db`
- Plan: Free
- Copy the "Internal Database URL" for later

#### 2. Create Redis Instance
- Go to Render Dashboard → "New" → "Redis"
- Name: `saluslogica-redis`
- Plan: Free
- Copy the "Internal Redis URL" for later

#### 3. Create Web Service (Backend)
- Go to Render Dashboard → "New" → "Web Service"
- Connect your repository
- Settings:
  - **Name**: `saluslogica-backend`
  - **Runtime**: Python 3
  - **Build Command**: `./build.sh`
  - **Start Command**: `gunicorn saluslogica.wsgi:application --bind 0.0.0.0:$PORT --workers 4 --threads 2 --timeout 60`

#### 4. Environment Variables
Add these environment variables to your web service:

```
PYTHON_VERSION=3.11.0
SECRET_KEY=your-secret-key-here (generate a strong random key)
DEBUG=False
DATABASE_URL=(from PostgreSQL database)
REDIS_URL=(from Redis instance)
CELERY_BROKER_URL=(from Redis instance)
CELERY_RESULT_BACKEND=(from Redis instance)
ALLOWED_HOSTS=.onrender.com,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=https://your-frontend.onrender.com,http://localhost:3000,http://localhost:5173
FRONTEND_URL=https://your-frontend.onrender.com
TIME_ZONE=Africa/Kigali
```

#### 5. Create Celery Worker
- Go to Render Dashboard → "New" → "Background Worker"
- Settings:
  - **Name**: `saluslogica-celery-worker`
  - **Runtime**: Python 3
  - **Build Command**: `pip install -r requirements.txt`
  - **Start Command**: `celery -A saluslogica worker --loglevel=info --concurrency=2`
- Copy the same environment variables from the web service

#### 6. Create Celery Beat
- Go to Render Dashboard → "New" → "Background Worker"
- Settings:
  - **Name**: `saluslogica-celery-beat`
  - **Runtime**: Python 3
  - **Build Command**: `pip install -r requirements.txt`
  - **Start Command**: `celery -A saluslogica beat --loglevel=info`
- Copy the same environment variables from the web service

## Post-Deployment

### 1. Create Superuser
After deployment, create a superuser to access the admin panel:

```bash
# In Render dashboard, go to your web service shell
python manage.py createsuperuser
```

### 2. Update Frontend Configuration
Update your frontend's API URL to point to your Render backend:

```javascript
// In your frontend .env file
VITE_API_URL=https://saluslogica-backend.onrender.com/api
```

### 3. Update CORS (if needed)
If you deploy your frontend separately, update the `CORS_ALLOWED_ORIGINS` environment variable in Render to include your frontend URL.

## Monitoring

- **Logs**: View logs in Render dashboard for each service
- **Database**: Use Render's PostgreSQL dashboard or connect with pgAdmin
- **Redis**: Use Render's Redis dashboard

## Troubleshooting

### Build Failures
- Check that `build.sh` has execute permissions: `chmod +x build.sh`
- Verify all dependencies are in `requirements.txt`

### Database Connection Issues
- Verify `DATABASE_URL` is correctly set
- Check database is in the same region as your web service

### Celery Not Working
- Verify `REDIS_URL` is correctly set
- Check Celery worker logs in Render dashboard

### Static Files Not Loading
- Ensure `collectstatic` runs successfully in build phase
- Check `STATIC_ROOT` and `STATIC_URL` settings

## Free Tier Limitations

- Web services spin down after 15 minutes of inactivity (cold start ~30 seconds)
- 750 hours of runtime per month
- 1 GB PostgreSQL storage
- 100 MB Redis storage

For production use with higher traffic, consider upgrading to a paid plan.
