from celery import shared_task
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
import logging

from .models import Notification, NotificationSettings

User = get_user_model()
logger = logging.getLogger(__name__)


@shared_task
def send_notification(user_id, notification_type, title, message, data=None):
    """Send notification to a user via their preferred channels"""
    try:
        user = User.objects.get(id=user_id)
        notification_settings, created = NotificationSettings.objects.get_or_create(
            user=user,
            defaults={
                'email_notifications': True,
                'push_notifications': True,
                'sms_notifications': False,
                'dose_reminders': True,
                'missed_dose_alerts': True,
                'refill_reminders': True,
                'interaction_alerts': True,
            }
        )
        
        # Create notification record
        notification = Notification.objects.create(
            user=user,
            notification_type=notification_type,
            title=title,
            message=message,
            data=data or {}
        )
        
        # Check if user should receive this type of notification
        if not should_send_notification(notification_type, notification_settings):
            notification.status = 'failed'
            notification.save()
            return f"Notification type {notification_type} is disabled for user {user.username}"
        
        # Send via enabled channels
        success_count = 0
        
        # Email notification
        if notification_settings.email_notifications:
            try:
                send_mail(
                    subject=title,
                    message=message,
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@saluslogica.com'),
                    recipient_list=[user.email],
                    fail_silently=False,
                )
                success_count += 1
                logger.info(f"Email notification sent to {user.email}")
            except Exception as e:
                logger.error(f"Failed to send email to {user.email}: {str(e)}")
        
        # Push notification via Firebase Cloud Messaging
        if notification_settings.push_notifications:
            try:
                from .fcm import send_push_to_user
                push_count = send_push_to_user(
                    user=user,
                    title=title,
                    body=message,
                    data={
                        'type': notification_type,
                        'notification_id': str(notification.id),
                        **(data or {}),
                    },
                )
                if push_count > 0:
                    success_count += 1
                    logger.info(f"FCM push sent to {push_count} device(s) for {user.username}")
                else:
                    logger.info(f"No active FCM devices for {user.username}")
            except Exception as e:
                logger.error(f"Failed to send push notification to {user.username}: {str(e)}")
        
        # SMS notification (in a real app, you'd integrate with Twilio/etc.)
        if notification_settings.sms_notifications and user.phone:
            try:
                # Simulate SMS - in production, integrate with SMS service
                logger.info(f"SMS notification sent to {user.phone}: {title}")
                success_count += 1
            except Exception as e:
                logger.error(f"Failed to send SMS to {user.phone}: {str(e)}")
        
        # Update notification status
        if success_count > 0:
            notification.status = 'sent'
            notification.sent_at = timezone.now()
        else:
            notification.status = 'failed'
        
        notification.save()
        
        return f"Notification sent to {user.username} via {success_count} channels"
        
    except User.DoesNotExist:
        return f"User with ID {user_id} not found"
    except Exception as e:
        logger.error(f"Error sending notification: {str(e)}")
        return f"Error: {str(e)}"


def should_send_notification(notification_type, settings):
    """Check if user should receive a specific type of notification"""
    type_mapping = {
        'dose_reminder': settings.dose_reminders,
        'missed_dose': settings.missed_dose_alerts,
        'medicine_refill': settings.refill_reminders,
        'interaction_alert': settings.interaction_alerts,
        'system': True,  # Always send system notifications
    }
    
    return type_mapping.get(notification_type, True)


@shared_task
def cleanup_old_notifications():
    """Clean up old notifications (older than 30 days)"""
    from django.utils import timezone
    
    cutoff_date = timezone.now() - timezone.timedelta(days=30)
    
    old_notifications = Notification.objects.filter(
        created_at__lt=cutoff_date,
        status__in=['sent', 'delivered', 'read']
    )
    
    count = old_notifications.count()
    old_notifications.delete()
    
    return f"Deleted {count} old notifications"


@shared_task
def mark_notifications_as_read(user_id, notification_ids=None):
    """Mark notifications as read for a user"""
    try:
        user = User.objects.get(id=user_id)
        
        if notification_ids:
            # Mark specific notifications as read
            notifications = Notification.objects.filter(
                id__in=notification_ids,
                user=user
            )
        else:
            # Mark all unread notifications as read
            notifications = Notification.objects.filter(
                user=user,
                is_read=False
            )
        
        count = notifications.count()
        notifications.update(
            is_read=True,
            read_at=timezone.now(),
            status='read'
        )
        
        return f"Marked {count} notifications as read for {user.username}"
        
    except User.DoesNotExist:
        return f"User with ID {user_id} not found"
    except Exception as e:
        return f"Error marking notifications as read: {str(e)}"
