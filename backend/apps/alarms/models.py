from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.medicines.models import Medicine

User = get_user_model()


class MedicationSchedule(models.Model):
    """
    Model to manage medication scheduling and alarm generation.
    This model tracks when medications should be scheduled and generates dose logs.
    """
    medicine = models.ForeignKey(
        Medicine, 
        on_delete=models.CASCADE, 
        related_name='medication_schedules'
    )
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='medication_schedules'
    )
    scheduled_time = models.DateTimeField(
        help_text="When this medication dose is scheduled"
    )
    local_time = models.DateTimeField(
        help_text="User's local time for this dose"
    )
    timezone = models.CharField(
        max_length=50, 
        default='UTC',
        help_text="User's timezone"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this schedule is currently active"
    )
    alarm_sent = models.BooleanField(
        default=False,
        help_text="Whether alarm has been sent for this schedule"
    )
    alarm_sent_at = models.DateTimeField(
        blank=True, 
        null=True,
        help_text="When the alarm was sent"
    )
    dose_log = models.OneToOneField(
        'doses.DoseLog',
        on_delete=models.CASCADE,
        related_name='medication_schedule',
        blank=True,
        null=True,
        help_text="Associated dose log for this schedule"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['scheduled_time']
        indexes = [
            models.Index(fields=['user', 'scheduled_time', 'is_active']),
            models.Index(fields=['alarm_sent', 'scheduled_time']),
        ]
        verbose_name = "Medication Schedule"
        verbose_name_plural = "Medication Schedules"
    
    def __str__(self):
        return f"{self.medicine.name} - {self.user.username} - {self.scheduled_time}"
    
    def mark_alarm_sent(self):
        """Mark that alarm has been sent for this schedule"""
        self.alarm_sent = True
        self.alarm_sent_at = timezone.now()
        self.save(update_fields=['alarm_sent', 'alarm_sent_at'])
    
    @property
    def is_due(self):
        """Check if this schedule is due for alarm"""
        now = timezone.now()
        return (
            self.is_active and 
            not self.alarm_sent and 
            self.scheduled_time <= now
        )
    
    @property
    def is_upcoming(self):
        """Check if this schedule is coming up soon (within 5 minutes)"""
        now = timezone.now()
        return (
            self.is_active and 
            not self.alarm_sent and 
            self.scheduled_time <= now + timezone.timedelta(minutes=5)
        )


class AlarmNotification(models.Model):
    """
    Model to track alarm notifications sent to users.
    This helps prevent duplicate alarms and tracks notification history.
    """
    medication_schedule = models.ForeignKey(
        MedicationSchedule,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='alarm_notifications'
    )
    notification_type = models.CharField(
        max_length=20,
        choices=(
            ('push', 'Push Notification'),
            ('email', 'Email'),
            ('sms', 'SMS'),
            ('in_app', 'In-App Alert'),
        ),
        default='in_app'
    )
    title = models.CharField(
        max_length=200,
        help_text="Notification title"
    )
    message = models.TextField(
        help_text="Notification message"
    )
    sent_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="When notification was sent"
    )
    delivered_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="When notification was delivered"
    )
    acknowledged_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="When user acknowledged the notification"
    )
    is_successful = models.BooleanField(
        default=False,
        help_text="Whether notification was successfully delivered"
    )
    error_message = models.TextField(
        blank=True,
        null=True,
        help_text="Any error that occurred during delivery"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Alarm Notification"
        verbose_name_plural = "Alarm Notifications"
    
    def __str__(self):
        return f"{self.user.username} - {self.title} - {self.created_at}"