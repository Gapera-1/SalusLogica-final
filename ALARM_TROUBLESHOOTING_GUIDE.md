# Alarm System Troubleshooting & Timezone Fix Guide

## Issue: Alarms Not Triggering

If you set a medicine time and the alarm doesn't appear when that time arrives, follow this guide to diagnose and fix the issue.

---

## Step 1: Diagnose System Status

### Use the Diagnostic Endpoint

1. **Open browser console** (F12)
2. **Run this command:**
   ```javascript
   const token = localStorage.getItem('access_token');
   fetch('http://localhost:8000/api/alarms/diagnose/', {
     headers: {'Authorization': `Token ${token}`}
   }).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
   ```

3. **Check the output for:**
   - ✅ `user_timezone`: Should NOT be "UTC" (should be "Africa/Kigali" or your timezone)
   - ✅ `medicines_count`: Should be > 0
   - ✅ `total_schedules`: Should be large (hours × days)
   - ✅ `pending_schedules_now`: Should show 0 or small number
   - ✅ `next_alarm`: Should show upcoming alarm details

---

## Step 2: Set Your Timezone (CRITICAL!)

### If `user_timezone: "UTC"` - This is the Problem!

Many users have UTC as default. You MUST set your correct timezone.

1. **Go to Profile** (top-right menu)
2. **Scroll to Timezone section**
3. **Select your timezone:**
   - **Rwanda**: Africa/Kigali
   - **Kenya**: Africa/Nairobi
   - **Uganda**: Africa/Kampala
   - **South Africa**: Africa/Johannesburg
   - **Find your timezone** in the dropdown

4. **Click Save Profile**

5. **Verify timezone was saved:**
   ```javascript
   const token = localStorage.getItem('access_token');
   fetch('http://localhost:8000/api/auth/profile/', {
     headers: {'Authorization': `Token ${token}`}
   }).then(r => r.json()).then(d => console.log(`Your timezone: ${d.timezone}`))
   ```

---

## Step 3: DELETE Old Schedules & Create New Ones

**Why?** Old schedules were created with wrong timezone (UTC). You need to delete them and recreate with correct timezone.

### Option A: Delete via Admin

1. Go to Django Admin: `http://localhost:8000/admin/`
2. Click **Medication Schedules** → Delete all old ones
3. Delete your medicines
4. Recreate medicines with correct times

### Option B: Delete via Command Line

```bash
cd backend
python manage.py shell
```

Then paste:
```python
from apps.alarms.models import MedicationSchedule
from apps.medicines.models import Medicine

# Delete all schedules
MedicationSchedule.objects.all().delete()
print("Schedules deleted")

# Delete all medicines  
Medicine.objects.all().delete()
print("Medicines deleted")

exit()
```

---

## Step 4: Create a Test Medicine

1. **Go to Dashboard**
2. **Click "Add Medicine"**
3. **Set medicine details:**
   - Name: "Test Alarm"
   - Time: **Set to CURRENT TIME + 1 MINUTE**
     - If it's 14:32, set "14:33"
   - Start Date: Today
   - End Date: Tomorrow
   - Stock: 10

4. **Click "Add Medicine"**

---

## Step 5: Verify Schedules Created

**In your browser console:**
```javascript
const token = localStorage.getItem('access_token');
fetch('http://localhost:8000/api/alarms/diagnose/', {
  headers: {'Authorization': `Token ${token}`}
}).then(r => r.json()).then(d => {
  console.log(`Total Schedules: ${d.total_schedules}`);
  console.log(`Next Alarm: ${d.next_alarm.local_time} (${d.next_alarm.minutes_away} minutes away)`);
})
```

**Expected output:**
```
Total Schedules: 2  (one for test time today, one for tomorrow)
Next Alarm: 2026-02-14 14:33:00 (1 minutes away)
```

---

## Step 6: Wait for Alarm

1. **Keep browser open**
2. **Wait until the scheduled time arrives**
3. **Watch for alarm:**
   - ✅ Box appears in top-right corner
   - ✅ Browser notification appears
   - ✅ Sound plays
   - ✅ Medicine name shows
   - ✅ "Taken" and "Snooze" buttons available

---

## Step 7: Troubleshooting - If Still No Alarm

### Check 1: Is Celery Running?

```bash
# In a terminal, check if processes are running
ps aux | grep celery
ps aux | grep redis

# Or Windows:
tasklist | findstr celery
tasklist | findstr redis
```

**Expected:** Should see output showing celery worker and beat are running

### Check 2: Are Schedules Being Created?

```bash
cd backend && python manage.py shell
from apps.alarms.models import MedicationSchedule
from django.utils import timezone
import pytz

# Show all schedules for current user
schedules = MedicationSchedule.objects.all()[:5]
for s in schedules:
    tz = pytz.timezone(s.timezone)
    local = s.scheduled_time.astimezone(tz)
    print(f"{s.medicine.name}: {local} ({s.timezone})")
```

### Check 3: Check Django Logs

```bash
# If logs are enabled, check them
tail -f backend/logs/django.log

# Look for:
# - "Created X schedules for medicine"
# - "Sent alarm for schedule"
```

### Check 4: Manual Celery Task Test

```bash
cd backend && python manage.py shell
from apps.alarms.tasks import check_medication_schedules

result = check_medication_schedules()
print(result)
# Should show: processed_schedules > 0, notifications_sent > 0
```

---

## Complete System Test Checklist

```
[ ] Timezone set in Profile (NOT UTC)
[ ] Deleted old schedules
[ ] Created test medicine for now+1min  
[ ] Checked diagnose endpoint - shows >0 schedules
[ ] Redis is running (redis-cli ping = PONG)
[ ] Celery worker running (shows "ready")
[ ] Celery beat running (shows "Waking up")
[ ] Django server running
[ ] Frontend loaded (Dashboard opens)
[ ] Waited for scheduled time
[ ] Alarm appeared in top-right
[ ] Browser notification showed (if allowed)
[ ] Alarm sound played
[ ] Clicked "Taken" - dose recorded
```

---

## Common Issues & Solutions

### Issue: Timezone still shows UTC after saving

**Solution:**
```bash
cd backend && python manage.py shell
from django.contrib.auth import get_user_model
user = get_user_model().objects.first()
user.userprofile.timezone = 'Africa/Kigali'
user.userprofile.save()
print(f"Timezone set to: {user.userprofile.timezone}")
exit()
```

### Issue: "0 pending schedules" in diagnose

**Solution:**
- Make sure `end_date` is in the future
- Check timezone is correct
- Verify times are in HH:MM format (24-hour)

### Issue: No browser notification

**Browser must be:**
1. In focus when alarm time arrives (first time)
2. Have notification permission granted
3. Not muted

**Grant permission:**
- Click notification icon when browser asks
- First alarm will require focusing browser

### Issue: Celery tasks not running

**Check Celery output:**
- Should see "celery@hostname ready"
- Should see "Scheduler: Waking up in X seconds"
- If not: Redis might not be running

**Fix Redis:**
```bash
# Windows
redis-server

# Or service
net start Redis
```

---

## Email Notification of Diagnose Output

You can collect all diagnostics:

```javascript
const token = localStorage.getItem('access_token');
fetch('http://localhost:8000/api/alarms/diagnose/', {
  headers: {'Authorization': `Token ${token}`}
})
.then(r => r.json())
.then(d => {
  console.log("=== ALARM SYSTEM DIAGNOSIS ===");
  console.log(`Server Time (UTC): ${d.server_time}`);
  console.log(`User Timezone: ${d.user_timezone}`);
  console.log(`User Local Time: ${d.user_local_time}`);
  console.log(`Medicines: ${d.medicines_count}`);
  console.log(`Total Schedules: ${d.total_schedules}`);
  console.log(`Pending Now: ${d.pending_schedules_now}`);
  console.log(`Pending Doses: ${d.pending_dose_logs}`);
  if (d.next_alarm.medicine_name) {
    console.log(`Next: ${d.next_alarm.medicine_name} at ${d.next_alarm.local_time} (${d.next_alarm.minutes_away} mins)`);
  }
})
```

Save this output if you need help debugging.

---

## Quick Fixes Summary

| Issue | Fix |
|-------|-----|
| Alarms don't trigger | Set correct timezone in Profile |
| Wrong alarm time | Check timezone + recreate medicines |
| No browser notification | Grant notification permission |
| Celery not running | Start: `celery -A saluslogica worker -l info` |
| Redis connection error | Start: `redis-server` |
| Schedules not created | Check signal handler in logs |
| Empty pending alarms | Check medicine `end_date` is future |

---

## Success Indicators

✅ System working when:
1. Diagnostic shows matching local time
2. `total_schedules` > 0
3. `next_alarm` shows upcoming medicine
4. Alarm appears exactly at scheduled time
5. User can click "Taken"/"Snooze"
6. Dose recorded in history

---

The alarm system uses **user's local timezone**. All times are stored in UTC for consistency, but displayed in user's local time. This ensures accuracy across timezones.

