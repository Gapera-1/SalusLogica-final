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
    AGE_CATEGORIES = (
        ('young_child', 'Young Child (0-5 years)'),
        ('older_child', 'Older Child (6-11 years)'),
        ('adult', 'Adult (12-65 years)'),
        ('elderly', 'Elderly (65+ years)'),
    )
    
    GENDER_CHOICES = (
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    )
    
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
    age_category = models.CharField(
        max_length=20,
        choices=AGE_CATEGORIES,
        null=True,
        blank=True,
        help_text="Patient age category for clinical considerations"
    )
    gender = models.CharField(
        max_length=10,
        choices=GENDER_CHOICES,
        null=True,
        blank=True,
        help_text="Patient gender"
    )
    is_pregnant = models.BooleanField(
        default=False,
        help_text="Is the patient pregnant (only applicable for female patients)"
    )
    
    def __str__(self):
        return f"{self.user.username}'s Profile"
