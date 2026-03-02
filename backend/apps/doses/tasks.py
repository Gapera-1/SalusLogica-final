from celery import shared_task
from django.utils import timezone
from datetime import datetime, timedelta
from django.contrib.auth import get_user_model
from .models import DoseLog, DoseHistory
from apps.medicines.models import Medicine
from apps.notifications.tasks import send_notification

User = get_user_model()


@shared_task
def create_dose_schedules():
    """Create dose schedules for all active medicines with proper timezone conversion.
    
    Medicine.times stores times in the user's LOCAL timezone (e.g. '14:00' means 2 PM local).
    We must convert to UTC before storing scheduled_time so alarms fire at the correct moment.
    """
    from django.utils import timezone
    from datetime import time, date
    import pytz
    
    today = timezone.now().date()
    active_medicines = Medicine.objects.filter(
        is_active=True, completed=False
    ).select_related('user')
    
    for medicine in active_medicines:
        if medicine.start_date <= today <= medicine.end_date:
            # Get user's timezone for proper conversion
            user_tz_str = getattr(medicine.user, 'timezone', None) or 'UTC'
            try:
                user_tz = pytz.timezone(user_tz_str)
            except pytz.exceptions.UnknownTimeZoneError:
                user_tz = pytz.UTC
                user_tz_str = 'UTC'
            
            for dose_time in medicine.times:
                try:
                    hour, minute = map(int, dose_time.split(':'))
                    
                    # Create naive local datetime and localize to user's timezone
                    naive_local = datetime.combine(today, time(hour, minute))
                    local_datetime = user_tz.localize(naive_local)
                    
                    # Convert to UTC for storage
                    utc_scheduled_time = local_datetime.astimezone(pytz.UTC)
                    
                    # Create dose log if it doesn't exist
                    DoseLog.objects.get_or_create(
                        medicine=medicine,
                        scheduled_time=utc_scheduled_time,
                        defaults={
                            'local_time': local_datetime,
                            'user_timezone': user_tz_str,
                            'status': 'pending'
                        }
                    )
                except (ValueError, IndexError):
                    continue


@shared_task
def send_dose_reminders():
    """Send reminders for upcoming doses"""
    from django.utils import timezone
    
    now = timezone.now()
    reminder_window = now + timedelta(minutes=15)  # Remind for doses in next 15 minutes
    
    upcoming_doses = DoseLog.objects.filter(
        status='pending',
        scheduled_time__lte=reminder_window,
        scheduled_time__gt=now
    ).select_related('medicine', 'medicine__user')
    
    for dose in upcoming_doses:
        send_notification.delay(
            user_id=dose.medicine.user.id,
            notification_type='dose_reminder',
            title=f'Medicine Reminder: {dose.medicine.name}',
            message=f'It\'s time to take {dose.medicine.dosage} of {dose.medicine.name}',
            data={
                'dose_id': dose.id,
                'medicine_id': dose.medicine.id,
                'medicine_name': dose.medicine.name,
                'dosage': dose.medicine.dosage,
                'scheduled_time': dose.scheduled_time.isoformat()
            }
        )


@shared_task
def check_missed_doses():
    """Check for missed doses and update their status"""
    from django.utils import timezone
    
    now = timezone.now()
    missed_threshold = now - timedelta(minutes=30)  # Consider dose missed after 30 minutes
    
    missed_doses = DoseLog.objects.filter(
        status='pending',
        scheduled_time__lt=missed_threshold
    ).select_related('medicine', 'medicine__user')
    
    for dose in missed_doses:
        dose.status = 'missed'
        dose.save()
        
        # Send missed dose notification
        send_notification.delay(
            user_id=dose.medicine.user.id,
            notification_type='missed_dose',
            title=f'Missed Dose: {dose.medicine.name}',
            message=f'You missed your scheduled dose of {dose.medicine.dosage} at {dose.scheduled_time.strftime("%H:%M")}',
            data={
                'dose_id': dose.id,
                'medicine_id': dose.medicine.id,
                'medicine_name': dose.medicine.name,
                'scheduled_time': dose.scheduled_time.isoformat()
            }
        )


@shared_task
def update_daily_adherence():
    """Update daily adherence statistics"""
    from django.utils import timezone
    
    yesterday = timezone.now().date() - timedelta(days=1)
    
    # Update adherence for each user and medicine combination
    users = User.objects.all()
    
    for user in users:
        medicines = Medicine.objects.filter(user=user, is_active=True)
        
        for medicine in medicines:
            doses_scheduled = DoseLog.objects.filter(
                medicine=medicine,
                scheduled_time__date=yesterday
            ).count()
            
            doses_taken = DoseLog.objects.filter(
                medicine=medicine,
                scheduled_time__date=yesterday,
                status='taken'
            ).count()
            
            doses_missed = DoseLog.objects.filter(
                medicine=medicine,
                scheduled_time__date=yesterday,
                status='missed'
            ).count()
            
            doses_snoozed = DoseLog.objects.filter(
                medicine=medicine,
                scheduled_time__date=yesterday,
                status='snoozed'
            ).count()
            
            adherence_percentage = 0
            if doses_scheduled > 0:
                adherence_percentage = (doses_taken / doses_scheduled) * 100
            
            DoseHistory.objects.update_or_create(
                user=user,
                medicine=medicine,
                date=yesterday,
                defaults={
                    'doses_scheduled': doses_scheduled,
                    'doses_taken': doses_taken,
                    'doses_missed': doses_missed,
                    'doses_snoozed': doses_snoozed,
                    'adherence_percentage': adherence_percentage
                }
            )


@shared_task
def cleanup_old_dose_logs():
    """Clean up old dose logs (older than 90 days)"""
    cutoff_date = timezone.now() - timedelta(days=90)
    
    old_doses = DoseLog.objects.filter(
        scheduled_time__lt=cutoff_date,
        status__in=['taken', 'missed']
    )
    
    count = old_doses.count()
    old_doses.delete()
    
    return f"Deleted {count} old dose logs"
