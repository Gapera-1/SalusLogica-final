# SalusLogica Backend API

A Django REST API backend for the medicine reminder application with Celery for background tasks and Redis for message brokering.

## Features

- **Authentication & User Management**: Token-based authentication with role-based access
- **Medicine Management**: CRUD operations for medicines with scheduling and tracking
- **Dose Tracking**: Real-time dose logging with adherence monitoring
- **Notifications**: Multi-channel notifications (email, push, SMS) with customizable settings
- **Analytics**: Comprehensive adherence reports and dashboard statistics
- **Drug Interactions**: Automated drug interaction checking and contraindication alerts
- **Background Tasks**: Celery-powered scheduled tasks for reminders and data processing

## Tech Stack

- **Backend**: Django 4.2 + Django REST Framework
- **Task Queue**: Celery with Redis broker
- **Database**: SQLite (development) / PostgreSQL (production)
- **Caching**: Redis
- **Monitoring**: Flower for Celery task monitoring

## Quick Start

### Prerequisites

- Python 3.11+
- Redis server
- PostgreSQL (optional, for production)

### Installation

1. **Clone and setup**:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. **Environment setup**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Database migrations**:
```bash
python manage.py makemigrations
python manage.py migrate
```

4. **Create superuser**:
```bash
python manage.py createsuperuser
```

5. **Start services**:
```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Start Django development server
python manage.py runserver

# Terminal 3: Start Celery worker
celery -A saluslogica worker --loglevel=info

# Terminal 4: Start Celery beat scheduler
celery -A saluslogica beat --loglevel=info

# Terminal 5: Start Flower (optional)
celery -A saluslogica flower
```

### Docker Setup

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f
```

## API Endpoints

### Authentication
- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login
- `POST /api/auth/logout/` - User logout
- `GET /api/auth/user/` - Get current user
- `GET /api/auth/profile/` - Get/update user profile

### Medicines
- `GET /api/medicines/` - List user medicines
- `POST /api/medicines/` - Add new medicine
- `GET /api/medicines/{id}/` - Get medicine details
- `PUT /api/medicines/{id}/` - Update medicine
- `DELETE /api/medicines/{id}/` - Delete medicine
- `POST /api/medicines/{id}/mark_completed/` - Mark medicine as completed
- `GET /api/medicines/active/` - Get active medicines
- `GET /api/medicines/low_stock/` - Get low stock medicines

### Doses
- `GET /api/doses/history/` - Get dose history
- `POST /api/doses/history/{id}/taken/` - Mark dose as taken
- `POST /api/doses/history/{id}/missed/` - Mark dose as missed
- `POST /api/doses/history/{id}/snooze/` - Snooze dose
- `GET /api/doses/pending/` - Get pending doses
- `GET /api/doses/today/` - Get today's doses
- `GET /api/doses/overdue/` - Get overdue doses

### Notifications
- `GET /api/notifications/` - Get user notifications
- `POST /api/notifications/{id}/mark_read/` - Mark notification as read
- `POST /api/notifications/mark_all_read/` - Mark all notifications as read
- `GET /api/notifications/unread_count/` - Get unread count
- `GET /api/notifications/center/` - Get notification center data

### Analytics
- `GET /api/analytics/dashboard/` - Get dashboard statistics
- `GET /api/analytics/adherence/` - Get adherence reports
- `GET /api/analytics/usage/` - Get medicine usage stats
- `POST /api/analytics/create-export/` - Create data export
- `GET /api/analytics/export-center/` - Get export center

### Interactions
- `POST /api/interactions/check/` - Check drug interactions
- `GET /api/interactions/history/` - Get interaction check history
- `GET /api/interactions/contraindications/` - Get contraindications
- `POST /api/interactions/add-allergy/` - Add user allergy
- `GET /api/interactions/search/` - Search drug database

## Celery Tasks

### Scheduled Tasks
- `create_dose_schedules` - Create daily dose schedules
- `send_dose_reminders` - Send upcoming dose reminders
- `check_missed_doses` - Check and mark missed doses
- `update_daily_adherence` - Update daily adherence statistics
- `cleanup_old_notifications` - Clean up old notifications
- `generate_adherence_reports` - Generate weekly/monthly reports

### Manual Tasks
- `process_export_request` - Process data export requests
- `initialize_drug_database` - Initialize drug database
- `check_drug_interactions` - Perform drug interaction checks

## Configuration

### Environment Variables
```bash
# Database
DATABASE_URL=sqlite:///db.sqlite3  # or postgresql://user:pass@host:port/dbname

# Redis/Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Email (for notifications)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
DEFAULT_FROM_EMAIL=noreply@saluslogica.com

# Security
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
```

## Development

### Running Tests
```bash
python manage.py test
```

### Creating Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### Loading Initial Data
```bash
python manage.py shell
>>> from apps.interactions.tasks import initialize_drug_database, add_common_interactions, add_common_contraindications
>>> initialize_drug_database()
>>> add_common_interactions()
>>> add_common_contraindications()
```

## Monitoring

### Flower (Celery Monitoring)
Access Flower at http://localhost:5555 to monitor:
- Active tasks
- Task history
- Worker status
- Task statistics

### Django Admin
Access admin panel at http://localhost:8000/admin for:
- User management
- Medicine management
- Dose logs
- Notifications
- Analytics data

## Production Deployment

### Security Settings
- Set `DEBUG=False`
- Configure `ALLOWED_HOSTS`
- Use HTTPS
- Set strong `SECRET_KEY`
- Configure proper database
- Set up email backend
- Configure CORS properly

### Performance
- Use PostgreSQL instead of SQLite
- Configure Redis for caching
- Set up proper logging
- Monitor Celery workers
- Use production WSGI server (Gunicorn)

## API Documentation

Once running, you can access:
- API endpoints at http://localhost:8000/api/
- Admin panel at http://localhost:8000/admin/
- Flower monitoring at http://localhost:5555/

## License

This project is licensed under the MIT License.
