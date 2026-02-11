from django.db import models
from django.contrib.auth import get_user_model
from apps.medicines.models import Medicine

User = get_user_model()


class DrugInteraction(models.Model):
    SEVERITY_CHOICES = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    )
    
    TYPE_CHOICES = (
        ('drug_drug', 'Drug-Drug'),
        ('drug_food', 'Drug-Food'),
        ('drug_alcohol', 'Drug-Alcohol'),
        ('drug_disease', 'Drug-Disease'),
    )
    
    medicine1 = models.CharField(max_length=200)  # Generic name or active ingredient
    medicine2 = models.CharField(max_length=200)  # Generic name or active ingredient
    interaction_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES)
    description = models.TextField()
    recommendation = models.TextField()
    sources = models.TextField(blank=True, null=True)  # Reference sources
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['medicine1', 'medicine2']
        ordering = ['-severity', 'medicine1', 'medicine2']
    
    def __str__(self):
        return f"{self.medicine1} + {self.medicine2} ({self.severity})"


class InteractionCheck(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='interaction_checks')
    medicines = models.JSONField()  # List of medicine names/IDs checked
    interactions_found = models.JSONField(default=list)  # List of interaction results
    check_date = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-check_date']
    
    def __str__(self):
        return f"{self.user.username} - {self.check_date}"


class Contraindication(models.Model):
    SEVERITY_CHOICES = DrugInteraction.SEVERITY_CHOICES
    
    medicine = models.CharField(max_length=200)  # Generic name or active ingredient
    condition = models.CharField(max_length=200)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES)
    description = models.TextField()
    recommendation = models.TextField()
    sources = models.TextField(blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['medicine', 'condition']
        ordering = ['-severity', 'medicine', 'condition']
    
    def __str__(self):
        return f"{self.medicine} - {self.condition} ({self.severity})"


class DrugDatabase(models.Model):
    """Master drug database for interaction checking"""
    generic_name = models.CharField(max_length=200, unique=True)
    brand_names = models.JSONField(default=list)  # List of brand names
    drug_class = models.CharField(max_length=100)
    atc_code = models.CharField(max_length=10, blank=True, null=True)  # Anatomical Therapeutic Chemical
    description = models.TextField(blank=True, null=True)
    food_interactions = models.JSONField(default=list)  # Known food interactions
    alcohol_interaction = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['generic_name']
    
    def __str__(self):
        return self.generic_name
