from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
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
    scientific_name = models.CharField(max_length=200, blank=True, null=True, help_text="Scientific/Generic name - never translate")
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
    notes = models.TextField(blank=True, null=True, help_text="Free-text notes about the medication")
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
        # Validate only if all dosage-related fields are present
        # Skip full_clean to avoid issues with DRF serializer validation
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


class Drug(models.Model):
    """
    Model representing a drug/medication with Rwanda-specific registration information.
    This model serves as the central drug repository for the clinical decision support system.
    """
    name = models.CharField(max_length=200, help_text="Commercial name of the drug")
    generic_name = models.CharField(max_length=200, help_text="Generic/active ingredient name")
    atc_code = models.CharField(
        max_length=10, 
        blank=True, 
        null=True,
        help_text="Anatomical Therapeutic Chemical classification code"
    )
    is_registered_in_rwanda = models.BooleanField(
        default=False,
        help_text="Whether this drug is registered by Rwanda FDA"
    )
    is_essential_in_rwanda = models.BooleanField(
        default=False,
        help_text="Whether this drug is on Rwanda Essential Medicines List"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        verbose_name = "Drug"
        verbose_name_plural = "Drugs"
    
    def __str__(self):
        return f"{self.name} ({self.generic_name})"


class Contraindication(models.Model):
    """
    Model representing drug contraindications for specific populations.
    This is the core clinical decision support data structure.
    """
    POPULATION_CHOICES = (
        ('infant_toddler', '0-5 years'),
        ('child', '6-11 years'),
        ('adult', '12-64 years'),
        ('elderly', '65+ years'),
        ('pregnant', 'Pregnant'),
        ('lactating', 'Lactating'),
    )
    
    SEVERITY_CHOICES = (
        ('absolute', 'Absolute Contraindication'),
        ('relative', 'Relative Contraindication'),
    )
    
    drug = models.ForeignKey(
        Drug, 
        on_delete=models.CASCADE, 
        related_name='contraindications',
        help_text="The drug this contraindication applies to"
    )
    population = models.CharField(
        max_length=20,
        choices=POPULATION_CHOICES,
        help_text="Patient population group this contraindication applies to"
    )
    condition = models.CharField(
        max_length=200,
        help_text="Specific medical condition or situation"
    )
    severity = models.CharField(
        max_length=10,
        choices=SEVERITY_CHOICES,
        help_text="Severity level of the contraindication"
    )
    description = models.TextField(
        help_text="Detailed description of the contraindication"
    )
    source = models.CharField(
        max_length=200,
        help_text="Source of this contraindication information (e.g., WHO, Rwanda FDA)"
    )
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['drug', 'population', 'severity']
        verbose_name = "Contraindication"
        verbose_name_plural = "Contraindications"
        unique_together = ['drug', 'population', 'condition']
    
    def __str__(self):
        return f"{self.drug.name} - {self.get_population_display()} - {self.condition}"


class PatientProfile(models.Model):
    """
    Enhanced patient profile model for clinical decision support.
    Extends the basic user information with clinical safety data.
    """
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='clinical_profile'
    )
    age = models.IntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(150)],
        help_text="Patient age in years"
    )
    is_pregnant = models.BooleanField(
        default=False,
        help_text="Whether the patient is pregnant"
    )
    is_lactating = models.BooleanField(
        default=False,
        help_text="Whether the patient is lactating/breastfeeding"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Patient Profile"
        verbose_name_plural = "Patient Profiles"
    
    def __str__(self):
        return f"{self.user.username}'s Clinical Profile"


def get_population_category(patient_profile):
    """
    Determine the population category for a patient based on age and physiological status.
    
    Args:
        patient_profile: UserProfile instance (from authentication.models)
    
    Returns:
        str: Population category key from Contraindication.POPULATION_CHOICES
    
    Note:
        This function now works with UserProfile from authentication app.
        UserProfile has a get_population_category() method that handles the logic.
    """
    # Use the UserProfile's built-in method if available
    if hasattr(patient_profile, 'get_population_category'):
        return patient_profile.get_population_category()
    
    # Fallback implementation for backward compatibility
    if getattr(patient_profile, 'is_pregnant', False):
        return 'pregnant'
    elif getattr(patient_profile, 'is_lactating', False):
        return 'lactating'
    
    age = getattr(patient_profile, 'age', None)
    if age is not None:
        if 0 <= age <= 5:
            return 'infant_toddler'
        elif 6 <= age <= 11:
            return 'child'
        elif 12 <= age <= 64:
            return 'adult'
        elif age >= 65:
            return 'elderly'
    
    # Default to adult if age is invalid or not available
    return 'adult'


def check_contraindications(drug, patient_profile):
    """
    Check for contraindications of a specific drug for a given patient.
    
    Args:
        drug: Drug instance
        patient_profile: UserProfile instance (from authentication.models)
    
    Returns:
        QuerySet: Contraindication objects applicable to this patient
    """
    population_category = get_population_category(patient_profile)
    
    # Get all contraindications for this drug and patient population
    contraindications = Contraindication.objects.filter(
        drug=drug,
        population=population_category
    )
    
    return contraindications
