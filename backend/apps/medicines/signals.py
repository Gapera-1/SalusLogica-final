from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.utils import timezone
from datetime import datetime, timedelta
from apps.medicines.models import Medicine
from apps.alarms.models import MedicationSchedule
import logging
import pytz

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Medicine)
def create_medication_schedules(sender, instance, created, **kwargs):
    """
    Signal handler to create MedicationSchedule entries when a medicine is created or updated.
    
    For each time slot in the medicine's 'times' field, this creates a schedule from
    the start_date to end_date.
    
    Example:
    - Medicine: "Aspirin" at times ["08:00", "14:00", "20:00"]
    - start_date: 2026-02-14, end_date: 2026-03-14
    - Creates 3 schedules per day for 28 days
    """
    
    if not instance.is_active:
        # Don't create schedules for inactive medicines
        return
    
    if not instance.times or not isinstance(instance.times, list) or len(instance.times) == 0:
        logger.warning(f"Medicine {instance.id} has no times defined, skipping schedule creation")
        return
    
    try:
        # Delete existing schedules if this is an update
        if not created:
            MedicationSchedule.objects.filter(medicine=instance).delete()
        
        # Get user's timezone for proper time conversion
        # Timezone is stored on User model, not UserProfile
        user_tz_str = instance.user.timezone or 'UTC'
        
        # Convert timezone string to pytz object
        try:
            user_tz = pytz.timezone(user_tz_str)
        except pytz.exceptions.UnknownTimeZoneError:
            logger.warning(f"Unknown timezone '{user_tz_str}' for user {instance.user.id}, using UTC")
            user_tz = pytz.UTC
        
        # Generate schedules for each day from start_date to end_date
        current_date = instance.start_date
        end_date = instance.end_date
        
        schedules_to_create = []
        
        while current_date <= end_date:
            # For each time slot in the medicine's times
            for time_str in instance.times:
                try:
                    # Parse time string (HH:MM format)
                    hour, minute = map(int, time_str.split(':'))
                    
                    # Create NAIVE datetime in user's local timezone
                    # This represents "14:00 in the user's local timezone"
                    naive_local_datetime = datetime.combine(
                        current_date, 
                        datetime.min.time().replace(hour=hour, minute=minute)
                    )
                    
                    # Localize to user's timezone
                    local_datetime = user_tz.localize(naive_local_datetime)
                    
                    # Convert to UTC for storage in database
                    # This ensures all times are in UTC for consistent querying
                    utc_scheduled_time = local_datetime.astimezone(pytz.UTC)
                    
                    schedules_to_create.append(
                        MedicationSchedule(
                            medicine=instance,
                            user=instance.user,
                            scheduled_time=utc_scheduled_time,  # Stored in UTC
                            local_time=local_datetime,          # Original local time
                            timezone=user_tz_str,               # Store timezone string for reference
                            is_active=True,
                            alarm_sent=False
                        )
                    )
                    
                    logger.debug(f"Created schedule: {time_str} ({user_tz_str}) -> {utc_scheduled_time} UTC")
                    
                except (ValueError, IndexError) as e:
                    logger.error(f"Invalid time format '{time_str}' for medicine {instance.id}: {str(e)}")
                    continue
            
            # Move to next day
            current_date += timedelta(days=1)
        
        # Bulk create schedules
        if schedules_to_create:
            MedicationSchedule.objects.bulk_create(schedules_to_create, batch_size=1000)
            logger.info(f"Created {len(schedules_to_create)} schedules for medicine {instance.id} (user tz: {user_tz_str})")
        else:
            logger.warning(f"No valid schedules created for medicine {instance.id}")
            
    except Exception as e:
        logger.error(f"Error creating medication schedules for medicine {instance.id}: {str(e)}", exc_info=True)


@receiver(pre_delete, sender=Medicine)
def delete_medication_schedules(sender, instance, **kwargs):
    """
    Signal handler to delete associated schedules when a medicine is deleted.
    """
    try:
        count, _ = MedicationSchedule.objects.filter(medicine=instance).delete()
        logger.info(f"Deleted {count} schedules for medicine {instance.id}")
    except Exception as e:
        logger.error(f"Error deleting medication schedules for medicine {instance.id}: {str(e)}")
