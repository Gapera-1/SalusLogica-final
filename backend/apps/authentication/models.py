from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
import uuid
from datetime import timedelta


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
    
    # Email verification fields
    email_verified = models.BooleanField(default=False, help_text="Has the user verified their email?")
    email_verification_sent_at = models.DateTimeField(null=True, blank=True, help_text="When was the last verification email sent?")
    
    # Password reset fields
    password_reset_sent_at = models.DateTimeField(null=True, blank=True, help_text="When was the last password reset email sent?")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.username} ({self.get_user_type_display()})"
    
    def can_resend_verification_email(self):
        """Check if enough time has passed to resend verification email (1 minute cooldown)"""
        if not self.email_verification_sent_at:
            return True
        return timezone.now() - self.email_verification_sent_at > timedelta(minutes=1)
    
    def can_request_password_reset(self):
        """Check if enough time has passed to request another password reset (5 minute cooldown)"""
        if not self.password_reset_sent_at:
            return True
        return timezone.now() - self.password_reset_sent_at > timedelta(minutes=5)


class EmailVerification(models.Model):
    """Email verification tokens for user registration"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='verification_tokens')
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    verified_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Verification token for {self.user.email}"
    
    def save(self, *args, **kwargs):
        if not self.expires_at:
            # Token expires in 24 hours
            self.expires_at = timezone.now() + timedelta(hours=24)
        super().save(*args, **kwargs)
    
    def is_valid(self):
        """Check if token is still valid (not expired and not used)"""
        return not self.verified_at and timezone.now() < self.expires_at
    
    def mark_as_verified(self):
        """Mark token as used and verify user's email"""
        self.verified_at = timezone.now()
        self.save()
        
        self.user.email_verified = True
        self.user.save()


class PasswordReset(models.Model):
    """Password reset tokens for forgot password functionality"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True, help_text="IP address of the requester")
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Password reset token for {self.user.email}"
    
    def save(self, *args, **kwargs):
        if not self.expires_at:
            # Token expires in 1 hour (shorter than email verification for security)
            self.expires_at = timezone.now() + timedelta(hours=1)
        super().save(*args, **kwargs)
    
    def is_valid(self):
        """Check if token is still valid (not expired and not used)"""
        return not self.used_at and timezone.now() < self.expires_at
    
    def mark_as_used(self):
        """Mark token as used"""
        self.used_at = timezone.now()
        self.save()


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
    
    # Clinical safety fields
    age = models.IntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(150)],
        null=True,
        blank=True,
        help_text="Patient age in years (exact age for clinical safety checks)"
    )
    age_category = models.CharField(
        max_length=20,
        choices=AGE_CATEGORIES,
        null=True,
        blank=True,
        help_text="Patient age category (auto-calculated from age if not provided)"
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
    is_lactating = models.BooleanField(
        default=False,
        help_text="Is the patient lactating/breastfeeding (only applicable for female patients)"
    )
    
    def __str__(self):
        return f"{self.user.username}'s Profile"
    
    def get_age_category(self):
        """
        Calculate age category from exact age.
        Returns age_category field if set, otherwise calculates from age.
        """
        if self.age_category:
            return self.age_category
        
        if self.age is not None:
            if self.age <= 5:
                return 'young_child'
            elif self.age <= 11:
                return 'older_child'
            elif self.age <= 64:
                return 'adult'
            else:
                return 'elderly'
        
        return None
    
    def get_population_category(self):
        """
        Determine the population category for contraindication checking.
        Compatible with medicines app contraindication system.
        
        Returns:
            str: Population category (infant_toddler, child, adult, elderly, pregnant, lactating)
        """
        if self.is_pregnant:
            return 'pregnant'
        if self.is_lactating:
            return 'lactating'
        
        if self.age is not None:
            if self.age <= 5:
                return 'infant_toddler'
            elif self.age <= 11:
                return 'child'
            elif self.age <= 64:
                return 'adult'
            else:
                return 'elderly'
        
        # Fallback to age_category if age not provided
        category_map = {
            'young_child': 'infant_toddler',
            'older_child': 'child',
            'adult': 'adult',
            'elderly': 'elderly'
        }
        return category_map.get(self.age_category, 'adult')
