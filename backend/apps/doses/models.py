from django.db import models
from django.contrib.auth import get_user_model
from apps.medicines.models import Medicine

User = get_user_model()


class DoseLog(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('taken', 'Taken'),
        ('missed', 'Missed'),
        ('snoozed', 'Snoozed'),
    )
    
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE, related_name='dose_logs')
    scheduled_time = models.DateTimeField()
    local_time = models.DateTimeField()  # User's local time
    user_timezone = models.CharField(max_length=50, default='UTC')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    taken_at = models.DateTimeField(blank=True, null=True)
    dismissed_at = models.DateTimeField(blank=True, null=True)
    snoozed_until = models.DateTimeField(blank=True, null=True)
    snooze_count = models.IntegerField(default=0)
    trigger_minute = models.CharField(max_length=10, blank=True, null=True)  # HH:MM format
    alarm_group_id = models.CharField(max_length=100, blank=True, null=True)  # For grouping doses
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-scheduled_time']
        indexes = [
            models.Index(fields=['medicine', 'status', 'scheduled_time']),
            models.Index(fields=['status', 'scheduled_time']),
        ]
    
    def __str__(self):
        return f"{self.medicine.name} - {self.scheduled_time} ({self.status})"
    
    @property
    def is_overdue(self):
        from django.utils import timezone
        return self.status == 'pending' and self.scheduled_time < timezone.now()


class DoseReminder(models.Model):
    dose_log = models.OneToOneField(DoseLog, on_delete=models.CASCADE, related_name='reminder')
    reminder_type = models.CharField(max_length=20, choices=(
        ('notification', 'Push Notification'),
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('alarm', 'Alarm'),
    ))
    sent_at = models.DateTimeField(blank=True, null=True)
    delivered_at = models.DateTimeField(blank=True, null=True)
    acknowledged_at = models.DateTimeField(blank=True, null=True)
    retry_count = models.IntegerField(default=0)
    is_successful = models.BooleanField(default=False)
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Reminder for {self.dose_log} - {self.reminder_type}"


class DoseHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='dose_history')
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE, related_name='history')
    date = models.DateField()
    doses_scheduled = models.IntegerField(default=0)
    doses_taken = models.IntegerField(default=0)
    doses_missed = models.IntegerField(default=0)
    doses_snoozed = models.IntegerField(default=0)
    adherence_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['user', 'medicine', 'date']
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.user.username} - {self.medicine.name} - {self.date} ({self.adherence_percentage}%)"
