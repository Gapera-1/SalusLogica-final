from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
import uuid

User = get_user_model()


class Medicine(models.Model):
    FREQUENCY_CHOICES = (
        ('once_daily', 'Once Daily'),
        ('twice_daily', 'Twice Daily'),
        ('three_times_daily', 'Three Times Daily'),
        ('four_times_daily', 'Four Times Daily'),
        ('as_needed', 'As Needed'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='medicines')
    name = models.CharField(max_length=200)
    dosage = models.CharField(max_length=100)  # e.g., "100mg", "2 tablets"
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES)
    times = models.JSONField(default=list)  # List of times in HH:MM format
    posology = models.TextField(blank=True, null=True)  # Additional instructions
    duration = models.IntegerField(help_text="Duration in days")
    
    # Clinical safety fields (from monolith)
    dose_mg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    dose_per_kg = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    
    # Food interaction fields (from monolith)
    food_to_avoid = models.JSONField(
        default=list, 
        blank=True,
        help_text="List of foods to avoid when taking this medicine"
    )
    food_advised = models.JSONField(
        default=list, 
        blank=True,
        help_text="List of foods recommended when taking this medicine"
    )
    
    # Enhanced scheduling
    start_date = models.DateField()
    end_date = models.DateField()
    taken_times = models.JSONField(default=dict)  # Track when doses were taken
    last_notified = models.JSONField(default=dict)  # Track last notification times
    is_active = models.BooleanField(default=True)
    completed = models.BooleanField(default=False)
    stock_count = models.IntegerField(default=0)
    prescribed_for = models.TextField(blank=True, null=True)
    prescribing_doctor = models.CharField(max_length=200, blank=True, null=True)
    instructions = models.TextField(blank=True, null=True, help_text="Special instructions for taking medicine")
    reminder_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def clean(self):
        """Clinical Safety Doctrine: Unified Dosage Validation (from monolith)"""
        if self.dose_mg and self.weight_kg and self.dose_per_kg:
            expected = Decimal(str(self.weight_kg)) * Decimal(str(self.dose_per_kg))
            tolerance = expected * Decimal('0.10')
            if not (expected - tolerance <= Decimal(str(self.dose_mg)) <= expected + tolerance):
                from django.core.exceptions import ValidationError
                raise ValidationError(f"Dosage Safety Alert: {self.dose_mg}mg is outside 10% safety margin.")
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.name} - {self.user.username}"
    
    @property
    def next_dose_time(self):
        """Calculate next dose time based on current time and medicine schedule"""
        from django.utils import timezone
        from datetime import datetime, time
        
        now = timezone.now()
        today = now.date()
        current_time = now.time()
        
        if not self.times or not self.is_active:
            return None
        
        # Sort times and find next dose for today
        sorted_times = sorted(self.times)
        
        for dose_time in sorted_times:
            hour, minute = map(int, dose_time.split(':'))
            dose_datetime = timezone.make_aware(
                datetime.combine(today, time(hour, minute))
            )
            
            if dose_datetime > now:
                return dose_time
        
        # If no more doses today, return first dose for tomorrow
        return sorted_times[0] if sorted_times else None


class MedicineInteraction(models.Model):
    SEVERITY_CHOICES = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    )
    
    medicine1 = models.ForeignKey(Medicine, on_delete=models.CASCADE, related_name='interactions_as_medicine1')
    medicine2 = models.ForeignKey(Medicine, on_delete=models.CASCADE, related_name='interactions_as_medicine2')
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES)
    description = models.TextField()
    recommendation = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['medicine1', 'medicine2']
    
    def __str__(self):
        return f"Interaction: {self.medicine1.name} + {self.medicine2.name} ({self.severity})"


class UserAllergy(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='allergies')
    allergen = models.CharField(max_length=200)
    severity = models.CharField(max_length=20, choices=MedicineInteraction.SEVERITY_CHOICES)
    reaction = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.allergen}"
