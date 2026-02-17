# 🚀 Alarm System - Complete Startup Guide

## The Issue
The alarm system requires **3 background services** to work. If any are missing, alarms won't trigger.

---

## Required Services

### 1️⃣ Redis (Message Broker)
Redis stores the task queue that Celery uses.

**Terminal 1 - Start Redis:**
```powershell
cd C:\Users\user\OneDrive\Desktop\SalusLogica-final\backend\redis
redis-server.exe redis.windows.conf
```

✅ **Expected output:** `Ready to accept connections`

**Verify it's running:**
```powershell
redis-cli ping
```
Should return: `PONG`

---

### 2️⃣ Celery Worker (Executes Tasks)
The worker listens for tasks and executes them (like checking medication schedules).

**Terminal 2 - Start Celery Worker:**
```powershell
cd C:\Users\user\OneDrive\Desktop\SalusLogica-final\backend
celery -A saluslogica worker -l info --pool=solo
```

✅ **Expected output:**
```
celery@COMPUTERNAME v5.x.x
...
[Tasks]
  * app.alarms.tasks.check_medication_schedules
  * ...
```

---

### 3️⃣ Celery Beat (Task Scheduler)
Celery Beat runs the alarm check **every 60 seconds**.

**Terminal 3 - Start Celery Beat:**
```powershell
cd C:\Users\user\OneDrive\Desktop\SalusLogica-final\backend
celery -A saluslogica beat -l info
```

✅ **Expected output:**
```
celery beat v5.x.x
Scheduler: django_celery_beat.schedulers.DatabaseScheduler
...
Scheduler started
```

---

### 4️⃣ Django Server (API)
The Django server serves the API that the frontend uses.

**Terminal 4 - Start Django:**
```powershell
cd C:\Users\user\OneDrive\Desktop\SalusLogica-full\backend
python manage.py runserver
```

✅ **Expected output:**
```
Starting development server at http://127.0.0.1:8000/
```

---

## Full Startup Sequence

### **Windows Users - Use PowerShell (Admin)**

Run each command in a separate PowerShell terminal (Ctrl+Shift+Esc to open new tab):

```powershell
# Terminal 1
cd C:\Users\user\OneDrive\Desktop\SalusLogica-final\backend\redis
redis-server.exe redis.windows.conf

# Terminal 2
cd C:\Users\user\OneDrive\Desktop\SalusLogica-final\backend
celery -A saluslogica worker -l info --pool=solo

# Terminal 3
cd C:\Users\user\OneDrive\Desktop\SalusLogica-final\backend
celery -A saluslogica beat -l info

# Terminal 4
cd C:\Users\user\OneDrive\Desktop\SalusLogica-final\backend
python manage.py runserver

# Terminal 5 (Frontend)
cd C:\Users\user\OneDrive\Desktop\SalusLogica-final\medicine-reminder
npm run dev
```

---

## ✅ Verification Checklist

After starting all services, verify everything is working:

### Check Endpoints
```powershell
# In a new terminal:

# 1. Check if Django is running
curl http://localhost:8000/api/alarms/active/

# 2. Check diagnostic info
curl http://localhost:8000/api/alarms/diagnose/

# 3. Check if Redis is accessible
redis-cli ping
```

### Create a Test Medicine
1. Open the app at `http://localhost:5173`
2. Go to **Add Medicine**
3. Create a medicine with a time **NOW or in the next 5 minutes**
4. Set it to repeat **Today**
5. Click **Save**

### Watch for the Alarm
- Wait up to 60 seconds (Celery checks every 60 seconds)
- You should see an alarm notification pop up
- You'll hear a sound and see a visual alarm

### Debug Info
Run this to see system status:
```powershell
curl http://localhost:8000/api/alarms/diagnose/
```

Expected response:
```json
{
  "server_time": "2024-01-15 14:30:45.123456+00:00",
  "user_timezone": "Africa/Nairobi",
  "user_local_time": "17:30:45",
  "medicines_count": 5,
  "total_schedules": 12,
  "pending_schedules_now": 0,
  "next_alarm": {
    "medicine_name": "Aspirin",
    "scheduled_time": "17:35:00",
    "minutes_until_alarm": 4.5
  }
}
```

---

## 🐛 Troubleshooting

### **Alarm Still Not Showing?**

1. **Check user timezone (MOST COMMON ISSUE)**
   - Go to Profile page in app
   - What timezone is shown? (Should be your local time, NOT "UTC")
   - If it says "UTC", refresh the page - it should auto-detect
   - If still UTC, manually select your timezone

2. **Check if Celery is actually running**
   - In Celery Beat terminal, you should see: `Scheduler started`
   - In Celery Worker terminal, you should see: `[2024-01-15 14:30:00,000: INFO/MainProcess] Ready to accept tasks`

3. **Check if Redis is running**
   - Run: `redis-cli ping`
   - Should return: `PONG`
   - If it fails, restart Redis server

4. **Check database has MedicationSchedule records**
   - Run: `python manage.py shell`
   - Then: `from apps.alarms.models import MedicationSchedule; print(MedicationSchedule.objects.count())`
   - Should be > 0

5. **Check Django logs for errors**
   - Look at Django terminal for any error messages
   - Check `/logs/` directory for error files

### **"No module named celery" error?**
```powershell
pip install celery redis django-celery-beat django-celery-results
```

### **Redis connection refused?**
- Make sure Redis is running in Terminal 1
- Check if port 6379 is in use: `netstat -ano | findstr :6379`

### **Celery tasks not running?**
- Verify Redis is running (redis-cli ping)
- Verify Celery Worker is running
- Check Django settings.py has CELERY config
- Restart all services

---

## 📋 Services Checklist

Before testing, confirm ALL are running:

- [ ] **Redis** running (Terminal 1) - `redis-server.exe redis.windows.conf`
- [ ] **Celery Worker** running (Terminal 2) - `celery -A saluslogica worker`
- [ ] **Celery Beat** running (Terminal 3) - `celery -A saluslogica beat`
- [ ] **Django** running (Terminal 4) - `python manage.py runserver`
- [ ] **Frontend** running (Terminal 5) - `npm run dev`
- [ ] User **timezone set correctly** (not UTC)
- [ ] Medicine **created with time in next 5 minutes**

---

## 🎯 Expected Behavior

1. **User creates medicine** at 14:00 local time
2. **Signal fires** immediately → Creates MedicationSchedule in database
3. **Celery Beat** checks every 60 seconds
4. **When 14:00 arrives:** Celery Task finds the schedule and creates notification
5. **Frontend polls** /api/alarms/active/ every 30 seconds
6. **Notification appears** on screen + sound plays ✅

---

## Advanced: Docker (Optional)

For easier multi-service management, use Docker:

```bash
cd backend
docker-compose up -d
```

This starts Redis + Celery + Beat automatically.

---

**Still having issues?** Check the logs:
- Django: Terminal output
- Celery: Look for task execution logs
- Redis: Check `redis-cli MONITOR` for activity
