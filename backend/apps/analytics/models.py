from django.db import models
from django.contrib.auth import get_user_model
from apps.medicines.models import Medicine
from apps.doses.models import DoseHistory

User = get_user_model()


class DashboardStats(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='dashboard_stats')
    total_medicines = models.IntegerField(default=0)
    active_medicines = models.IntegerField(default=0)
    doses_today = models.IntegerField(default=0)
    doses_taken_today = models.IntegerField(default=0)
    adherence_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    missed_doses_week = models.IntegerField(default=0)
    streak_days = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username}'s Dashboard Stats"


class AdherenceReport(models.Model):
    PERIOD_CHOICES = (
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='adherence_reports')
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE, related_name='adherence_reports', null=True, blank=True)
    period = models.CharField(max_length=10, choices=PERIOD_CHOICES)
    start_date = models.DateField()
    end_date = models.DateField()
    doses_scheduled = models.IntegerField(default=0)
    doses_taken = models.IntegerField(default=0)
    doses_missed = models.IntegerField(default=0)
    adherence_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'medicine', 'period', 'start_date', 'end_date']
        ordering = ['-start_date']
    
    def __str__(self):
        medicine_name = self.medicine.name if self.medicine else 'All Medicines'
        return f"{self.user.username} - {medicine_name} ({self.period})"


class MedicineUsageStats(models.Model):
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE, related_name='usage_stats')
    date = models.DateField()
    total_doses = models.IntegerField(default=0)
    taken_doses = models.IntegerField(default=0)
    missed_doses = models.IntegerField(default=0)
    adherence_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['medicine', 'date']
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.medicine.name} - {self.date} ({self.adherence_rate}%)"


class ExportRequest(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    )
    
    EXPORT_TYPES = (
        ('adherence_report', 'Adherence Report'),
        ('medicine_list', 'Medicine List'),
        ('dose_history', 'Dose History'),
        ('full_data', 'Full Data Export'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='export_requests')
    export_type = models.CharField(max_length=20, choices=EXPORT_TYPES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    parameters = models.JSONField(default=dict)  # Export parameters like date range
    file_path = models.CharField(max_length=500, blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.get_export_type_display()} ({self.status})"
