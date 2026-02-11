from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    USER_TYPES = (
        ('patient', 'Patient'),
        ('pharmacy_admin', 'Pharmacy Admin'),
        ('doctor', 'Doctor'),
    )
    
    POPULATION_TYPES = (
        ('young', 'Young (18-35)'),
        ('pregnant', 'Pregnant'),
        ('elderly', 'Elderly (65+)'),
        ('extreme', 'Extreme Age'),
    )
    
    user_type = models.CharField(max_length=20, choices=USER_TYPES, default='patient')
    population_type = models.CharField(
        max_length=20, 
        choices=POPULATION_TYPES, 
        null=True, 
        blank=True,
        help_text="Population type for clinical safety checks"
    )
    phone = models.CharField(max_length=20, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    timezone = models.CharField(max_length=50, default='UTC')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.username} ({self.get_user_type_display()})"


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    notification_preferences = models.JSONField(default=dict)
    emergency_contact = models.CharField(max_length=100, blank=True, null=True)
    emergency_phone = models.CharField(max_length=20, blank=True, null=True)
    medical_conditions = models.TextField(blank=True, null=True)
    allergies = models.TextField(blank=True, null=True)
    
    # Enhanced fields from monolith
    weight_kg = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    height_cm = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    
    def __str__(self):
        return f"{self.user.username}'s Profile"
