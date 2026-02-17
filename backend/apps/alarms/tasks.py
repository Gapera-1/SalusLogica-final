from celery import shared_task
from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model
from apps.alarms.models import MedicationSchedule, AlarmNotification
from apps.doses.models import DoseLog
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


@shared_task
def check_medication_schedules():
    """
    Celery task that runs every minute to check for upcoming medication doses.
    This task:
    1. Finds all medication schedules that are due or upcoming
    2. Creates dose logs for schedules that don't have them
    3. Sends alarm notifications for due schedules
    4. Updates schedule status
    """
    now = timezone.now()
    upcoming_threshold = now + timezone.timedelta(minutes=5)
    
    # Get all active schedules that are due or upcoming within 5 minutes
    schedules = MedicationSchedule.objects.filter(
        is_active=True,
        alarm_sent=False,
        scheduled_time__lte=upcoming_threshold
    ).select_related('medicine', 'user', 'dose_log')
    
    processed_count = 0
    notification_count = 0
    
    logger.info(f"Checking medication schedules at {now} (UTC)")
    
    for schedule in schedules:
        try:
            with transaction.atomic():
                # Create dose log if it doesn't exist
                if not schedule.dose_log:
                    # Use local time for trigger_minute display
                    local_time_str = schedule.local_time.strftime('%H:%M') if schedule.local_time else schedule.scheduled_time.strftime('%H:%M')
                    
                    dose_log = DoseLog.objects.create(
                        medicine=schedule.medicine,
                        scheduled_time=schedule.scheduled_time,
                        local_time=schedule.local_time or schedule.scheduled_time,
                        user_timezone=schedule.timezone,
                        status='pending',
                        trigger_minute=local_time_str,
                        alarm_group_id=f"schedule_{schedule.id}"
                    )
                    schedule.dose_log = dose_log
                    schedule.save(update_fields=['dose_log'])
                    logger.info(f"Created dose log for schedule {schedule.id}")
                
                # Check if alarm should be sent (due time reached)
                if schedule.scheduled_time <= now:
                    # Send alarm notification
                    send_alarm_notification(schedule)
                    schedule.mark_alarm_sent()
                    notification_count += 1
                    logger.info(f"Sent alarm for schedule {schedule.id}")
                
                processed_count += 1
                
        except Exception as e:
            logger.error(f"Error processing schedule {schedule.id}: {str(e)}")
            continue
    
    logger.info(f"Processed {processed_count} schedules, sent {notification_count} alarms")
    return {
        'processed_schedules': processed_count,
        'notifications_sent': notification_count,
        'timestamp': now.isoformat()
    }


def send_alarm_notification(schedule):
    """
    Send alarm notification for a medication schedule.
    Creates in-app notification with Kinyarwanda localization.
    """
    title = "Igihe cyo gufata umuti kigeze"
    
    # Create message in Kinyarwanda
    if schedule.medicine.dosage:
        message = f"Igihe cyo gufata {schedule.medicine.name} ({schedule.medicine.dosage}) cyageze. Nyamuneka wifate umuti wawe."
    else:
        message = f"Igihe cyo gufata {schedule.medicine.name} cyageze. Nyamuneka wifate umuti wawe."
    
    # Create in-app notification
    AlarmNotification.objects.create(
        medication_schedule=schedule,
        user=schedule.user,
        notification_type='in_app',
        title=title,
        message=message,
        sent_at=timezone.now(),
        is_successful=True
    )
    
    # TODO: Add push notification, email, or SMS integration here
    # For now, we only create in-app notifications


@shared_task
def cleanup_old_schedules():
    """
    Cleanup old medication schedules and notifications.
    Runs daily to remove old data and keep the system clean.
    """
    cutoff_date = timezone.now() - timezone.timedelta(days=30)
    
    # Delete old schedules that are completed and older than 30 days
    old_schedules = MedicationSchedule.objects.filter(
        scheduled_time__lt=cutoff_date,
        alarm_sent=True
    )
    
    schedule_count = old_schedules.count()
    old_schedules.delete()
    
    # Delete old notifications older than 30 days
    old_notifications = AlarmNotification.objects.filter(
        created_at__lt=cutoff_date
    )
    
    notification_count = old_notifications.count()
    old_notifications.delete()
    
    logger.info(f"Cleaned up {schedule_count} old schedules and {notification_count} old notifications")
    return {
        'schedules_deleted': schedule_count,
        'notifications_deleted': notification_count
    }


@shared_task
def generate_daily_schedules():
    """
    Generate medication schedules for the day.
    This task runs at midnight to create schedules for all active medicines.
    """
    from apps.medicines.models import Medicine
    from datetime import datetime, time
    
    today = timezone.now().date()
    generated_count = 0
    
    # Get all active medicines
    active_medicines = Medicine.objects.filter(
        is_active=True,
        start_date__lte=today,
        end_date__gte=today
    ).select_related('user')
    
    for medicine in active_medicines:
        try:
            # Generate schedules for each time in medicine.times
            for time_str in medicine.times:
                hour, minute = map(int, time_str.split(':'))
                scheduled_datetime = timezone.make_aware(
                    datetime.combine(today, time(hour, minute))
                )
                
                # Only create if the time is in the future
                if scheduled_datetime > timezone.now():
                    # Check if schedule already exists
                    existing_schedule = MedicationSchedule.objects.filter(
                        medicine=medicine,
                        user=medicine.user,
                        scheduled_time=scheduled_datetime
                    ).first()
                    
                    if not existing_schedule:
                        MedicationSchedule.objects.create(
                            medicine=medicine,
                            user=medicine.user,
                            scheduled_time=scheduled_datetime,
                            local_time=scheduled_datetime,
                            timezone=medicine.user.timezone or 'UTC'
                        )
                        generated_count += 1
                        
        except Exception as e:
            logger.error(f"Error generating schedule for medicine {medicine.id}: {str(e)}")
            continue
    
    logger.info(f"Generated {generated_count} medication schedules for {today}")
    return {
        'schedules_generated': generated_count,
        'date': today.isoformat()
    }
