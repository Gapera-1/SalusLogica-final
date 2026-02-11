from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
import uuid

User = get_user_model()


class DrugDatabase(models.Model):
    """Comprehensive drug database for interaction checking"""
    name = models.CharField(max_length=200)
    generic_name = models.CharField(max_length=200, blank=True)
    brand_names = models.JSONField(default=list)  # List of brand names
    drug_class = models.CharField(max_length=100)  # e.g., 'NSAID', 'Antibiotic', etc.
    description = models.TextField(blank=True)
    
    # Categorization
    categories = models.JSONField(default=list)  # e.g., ['pain_relief', 'anti_inflammatory']
    
    # Safety information
    is_prescription_only = models.BooleanField(default=True)
    requires_monitoring = models.BooleanField(default=False)
    max_daily_dose = models.CharField(max_length=50, blank=True)
    
    # Metadata
    fda_approved = models.BooleanField(default=True)
    active_ingredients = models.JSONField(default=list)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} ({self.generic_name})"


class DrugInteraction(models.Model):
    """Drug-drug interactions"""
    SEVERITY_LEVELS = [
        ('MINOR', 'Minor'),
        ('MODERATE', 'Moderate'),
        ('MAJOR', 'Major'),
        ('CONTRAINDICATED', 'Contraindicated'),
    ]
    
    drug1 = models.ForeignKey(DrugDatabase, on_delete=models.CASCADE, related_name='interactions_as_drug1')
    drug2 = models.ForeignKey(DrugDatabase, on_delete=models.CASCADE, related_name='interactions_as_drug2')
    
    severity = models.CharField(max_length=20, choices=SEVERITY_LEVELS)
    description = models.TextField()
    
    # Clinical information
    mechanism = models.TextField(blank=True)  # How the interaction occurs
    symptoms = models.JSONField(default=list)  # Symptoms of interaction
    management = models.TextField(blank=True)  # How to manage the interaction
    
    # Timing information
    onset_time = models.CharField(max_length=50, blank=True)  # e.g., 'Immediate', 'Hours to days'
    duration = models.CharField(max_length=50, blank=True)  # e.g., 'Until drug discontinued'
    
    # Evidence level
    evidence_level = models.CharField(
        max_length=20,
        choices=[
            ('ESTABLISHED', 'Established'),
            ('PROBABLE', 'Probable'),
            ('POSSIBLE', 'Possible'),
            ('THEORETICAL', 'Theoretical'),
        ],
        default='ESTABLISHED'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['drug1', 'drug2']
    
    def __str__(self):
        return f"{self.drug1.name} + {self.drug2.name} ({self.severity})"


class Contraindication(models.Model):
    """Medical contraindications for drugs"""
    CONTRAINDICATION_TYPES = [
        ('DISEASE', 'Disease Condition'),
        ('AGE_GROUP', 'Age Group'),
        ('PREGNANCY', 'Pregnancy'),
        ('BREASTFEEDING', 'Breastfeeding'),
        ('MEDICAL_CONDITION', 'Medical Condition'),
        ('LIFESTYLE', 'Lifestyle Factor'),
    ]
    
    POPULATION_GROUPS = [
        ('YOUNG', 'Young (18-35)'),
        ('PREGNANT', 'Pregnant'),
        ('ELDERLY', 'Elderly (65+)'),
        ('EXTREME', 'Extreme Age'),
    ]
    
    drug = models.ForeignKey(DrugDatabase, on_delete=models.CASCADE, related_name='contraindications')
    contraindication_type = models.CharField(max_length=30, choices=CONTRAINDICATION_TYPES)
    condition = models.CharField(max_length=200)  # Specific condition
    
    # Population-specific contraindications
    population_groups = models.JSONField(
        default=list,
        blank=True,
        help_text="Population groups this contraindication applies to"
    )
    
    severity = models.CharField(
        max_length=20,
        choices=[
            ('RELATIVE', 'Relative'),
            ('ABSOLUTE', 'Absolute'),
        ],
        default='ABSOLUTE'
    )
    
    description = models.TextField()
    rationale = models.TextField(blank=True)  # Why this is contraindicated
    
    # Alternative options
    alternatives = models.JSONField(default=list)  # Alternative drugs or approaches
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.drug.name} - {self.condition} ({self.severity})"


class UserAllergy(models.Model):
    """Patient allergies"""
    ALLERGY_TYPES = [
        ('DRUG', 'Drug Allergy'),
        ('FOOD', 'Food Allergy'),
        ('ENVIRONMENTAL', 'Environmental Allergy'),
        ('OTHER', 'Other'),
    ]
    
    SEVERITY_LEVELS = [
        ('MILD', 'Mild'),
        ('MODERATE', 'Moderate'),
        ('SEVERE', 'Severe'),
        ('ANAPHYLAXIS', 'Anaphylaxis'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='allergies')
    allergen = models.CharField(max_length=200)  # Name of allergen
    allergy_type = models.CharField(max_length=20, choices=ALLERGY_TYPES)
    severity = models.CharField(max_length=20, choices=SEVERITY_LEVELS)
    
    # Symptoms and reactions
    symptoms = models.JSONField(default=list)
    reaction_description = models.TextField(blank=True)
    
    # Management
    avoidance_strategies = models.JSONField(default=list)
    emergency_treatment = models.TextField(blank=True)
    
    # Cross-reactivity
    cross_reactive_substances = models.JSONField(default=list)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.allergen} ({self.severity})"


class FoodInteraction(models.Model):
    """Food-medicine interactions"""
    SEVERITY_LEVELS = [
        ('MINOR', 'Minor'),
        ('MODERATE', 'Moderate'),
        ('MAJOR', 'Major'),
        ('SEVERE', 'Severe'),
    ]
    
    medicine = models.ForeignKey('Medicine', on_delete=models.CASCADE, related_name='food_interactions')
    food = models.CharField(max_length=100)  # Name of food
    food_category = models.CharField(max_length=50)  # e.g., 'Dairy', 'Citrus', 'Alcohol'
    
    severity = models.CharField(max_length=20, choices=SEVERITY_LEVELS)
    description = models.TextField()  # How the interaction occurs
    symptoms = models.JSONField(default=list)  # Symptoms of interaction
    management = models.TextField(blank=True)  # How to manage the interaction
    
    # Timing
    onset_time = models.CharField(max_length=50, blank=True)  # e.g., 'Immediate', '30 minutes'
    duration = models.CharField(max_length=50, blank=True)  # e.g., '2 hours', 'Until next dose'
    
    # Recommendations
    recommendation = models.TextField(blank=True)  # What to do about this interaction
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.medicine.name} + {self.food} ({self.severity})"
