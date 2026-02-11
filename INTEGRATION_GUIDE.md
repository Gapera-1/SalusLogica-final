# Frontend-Backend Integration Setup

## 🚀 Quick Start Guide

### 1. Start the Backend Server
```bash
cd backend
python manage.py runserver
```

### 2. Start Celery Worker (for background tasks)
```bash
cd backend
celery -A saluslogica worker --loglevel=info
```

### 3. Start Redis (if not running)
```bash
redis-server
```

### 4. Start the Frontend Development Server
```bash
cd medicine-reminder
npm run dev
```

## ✅ Integration Status

### Completed Integrations:
- ✅ **Authentication**: Login/Register with real backend API
- ✅ **Medicine Management**: CRUD operations connected
- ✅ **Dose Tracking**: Real-time dose logging
- ✅ **Notifications**: Backend notification system
- ✅ **Analytics**: Dashboard and reporting
- ✅ **Drug Interactions**: Interaction checking

### API Endpoints Connected:
- `POST /api/auth/login/` - User authentication
- `GET /api/medicines/` - List medicines
- `POST /api/medicines/` - Add medicine
- `PUT /api/medicines/{id}/` - Update medicine
- `DELETE /api/medicines/{id}/` - Delete medicine
- `GET /api/doses/pending/` - Get pending doses
- `POST /api/doses/{id}/taken/` - Mark dose as taken
- `GET /api/notifications/` - Get notifications
- `GET /api/analytics/dashboard/` - Get dashboard stats

## 📁 File Structure

```
CapstoneProject/
├── backend/                    # Django backend
│   ├── manage.py
│   ├── saluslogica/
│   │   ├── settings.py
│   │   └── urls.py
│   └── apps/
│       ├── authentication/
│       ├── medicines/
│       ├── doses/
│       ├── notifications/
│       ├── analytics/
│       └── interactions/
└── medicine-reminder/          # React frontend
    ├── src/
    │   ├── services/api.js   # API service layer
    │   ├── pages/           # React components
    │   └── .env             # Environment variables
    └── package.json
```

## 🔧 Configuration

### Backend Environment (.env)
```bash
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=sqlite:///db.sqlite3
CELERY_BROKER_URL=redis://localhost:6379/0
```

### Frontend Environment (.env)
```bash
VITE_API_URL=http://localhost:8000/api
VITE_ENV=development
VITE_ENABLE_NOTIFICATIONS=true
```

## 🧪 Testing the Integration

### 1. Test Authentication
1. Navigate to `http://localhost:5173`
2. Click "Sign Up" and create a new account
3. Login with the new credentials
4. Check browser localStorage for `access_token`

### 2. Test Medicine Management
1. After login, go to "Medicine List"
2. Click "Add Medicine"
3. Fill form and submit
4. Verify medicine appears in list
5. Check backend admin panel at `http://localhost:8000/admin`

### 3. Test API Connection
Open browser console and check for:
- Successful API calls to `http://localhost:8000/api/*`
- No CORS errors
- Proper authentication headers

## 🔍 Troubleshooting

### CORS Issues
Add to backend settings:
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
]
```

### Authentication Issues
Check:
- Frontend sends `Authorization: Token <token>` header
- Backend has `rest_framework.authentication.TokenAuthentication`
- Token is stored in localStorage

### Database Issues
```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
```

## 📊 Monitoring

### Backend Admin Panel
- URL: `http://localhost:8000/admin`
- View users, medicines, doses, notifications

### Celery Monitoring (Flower)
- URL: `http://localhost:5555`
- Monitor background tasks

### API Testing
Use tools like Postman or Insomnia to test endpoints directly.

## 🚀 Production Deployment

### Backend
```bash
# Collect static files
python manage.py collectstatic

# Run with Gunicorn
gunicorn saluslogica.wsgi:application
```

### Frontend
```bash
# Build for production
npm run build

# Serve static files
# Configure nginx or similar
```

## 📝 Next Steps

1. **Real-time Updates**: Implement WebSocket connections
2. **Push Notifications**: Add service worker for mobile
3. **File Uploads**: Add medicine images/documents
4. **Advanced Analytics**: Expand reporting features
5. **Mobile App**: React Native integration

The frontend is now fully integrated with the Django backend! 🎉
