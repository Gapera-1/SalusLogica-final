"""
Pharmacy Admin Models
"""

from django.db import models
from django.conf import settings
from django.core.validators import RegexValidator
from .utils.pharmacy_id_generator import PharmacyAdminIDGenerator


class PharmacyAdmin(models.Model):
    """Pharmacy Admin model with unique ID generation"""
    
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='pharmacy_admin')
    
    # Pharmacy Admin ID with specific format: 00x0y0zph/hp0n
    pharmacy_id = models.CharField(
        max_length=11,
        unique=True,
        validators=[
            RegexValidator(
                regex=r'^\d{3}\d{2}\d{2}(PH|HP)\d{2}$',
                message='Pharmacy ID must be in format: 00x0y0zph/hp0n'
            )
        ],
        help_text="Format: 00x0y0zph/hp0n (Country-Province-District-Type-Number)"
    )
    
    # Location information
    country = models.CharField(max_length=100)
    province = models.CharField(max_length=100)
    district = models.CharField(max_length=100)
    
    # Facility details
    facility_name = models.CharField(max_length=200)
    facility_type = models.CharField(
        max_length=10,
        choices=[
            ('pharmacy', 'Pharmacy'),
            ('hospital', 'Hospital'),
        ]
    )
    
    # Contact information
    phone_number = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    
    # License information
    license_number = models.CharField(max_length=50, blank=True)
    license_expiry = models.DateField(null=True, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Pharmacy Admin"
        verbose_name_plural = "Pharmacy Admins"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.facility_name} ({self.pharmacy_id})"
    
    def save(self, *args, **kwargs):
        # Generate pharmacy ID if not provided
        if not self.pharmacy_id:
            self.pharmacy_id = self.generate_pharmacy_id()
        
        super().save(*args, **kwargs)
    
    def generate_pharmacy_id(self):
        """Generate unique pharmacy admin ID"""
        generator = PharmacyAdminIDGenerator()
        
        # Generate ID with retry logic
        max_attempts = 100
        for attempt in range(max_attempts):
            try:
                pharmacy_id = generator.generate_id(
                    country='RW',  # Default to Rwanda, can be made configurable
                    province=self.province,
                    district=self.district,
                    facility_type=self.facility_type
                )
                
                # Check if ID already exists
                if not PharmacyAdmin.objects.filter(pharmacy_id=pharmacy_id).exists():
                    return pharmacy_id
                    
            except (ValueError, KeyError):
                continue
        
        raise ValueError("Unable to generate unique pharmacy ID after maximum attempts")
    
    @property
    def patient_count(self):
        """Get number of patients associated with this pharmacy admin"""
        return self.patient_associations.count()
    
    @property
    def active_patient_count(self):
        """Get number of active patients"""
        return self.patient_associations.filter(is_active=True).count()


class PatientPharmacyAssociation(models.Model):
    """Association between patients and pharmacy admins"""
    
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='pharmacy_associations'
    )
    pharmacy_admin = models.ForeignKey(
        PharmacyAdmin, 
        on_delete=models.CASCADE, 
        related_name='patient_associations'
    )
    
    # Association details
    assigned_date = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    # Consent and permissions
    consent_given = models.BooleanField(default=False)
    consent_date = models.DateTimeField(null=True, blank=True)
    
    # Notes
    notes = models.TextField(blank=True)
    
    class Meta:
        unique_together = ['patient', 'pharmacy_admin']
        verbose_name = "Patient-Pharmacy Association"
        verbose_name_plural = "Patient-Pharmacy Associations"
    
    def __str__(self):
        return f"{self.patient.username} - {self.pharmacy_admin.facility_name}"


class AdverseReaction(models.Model):
    """Adverse reactions reported by patients"""
    
    # Patient information
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='adverse_reactions'
    )
    pharmacy_admin = models.ForeignKey(
        PharmacyAdmin, 
        on_delete=models.CASCADE, 
        related_name='adverse_reactions',
        null=True,  # Can be reported without pharmacy admin
        blank=True
    )
    
    # Reaction details
    reaction_type = models.CharField(
        max_length=50,
        choices=[
            ('allergic', 'Allergic Reaction'),
            ('side_effect', 'Side Effect'),
            ('adverse_event', 'Adverse Event'),
            ('medication_error', 'Medication Error'),
            ('other', 'Other'),
        ]
    )
    
    severity = models.CharField(
        max_length=20,
        choices=[
            ('mild', 'Mild'),
            ('moderate', 'Moderate'),
            ('severe', 'Severe'),
            ('life_threatening', 'Life Threatening'),
        ]
    )
    
    # Medication information
    medication_name = models.CharField(max_length=200)
    medication_dosage = models.CharField(max_length=100, blank=True)
    medication_batch = models.CharField(max_length=50, blank=True)
    
    # Reaction details
    symptoms = models.TextField(help_text="Describe the symptoms experienced")
    onset_time = models.DateTimeField(help_text="When did the reaction start?")
    duration = models.CharField(max_length=100, blank=True, help_text="How long did the reaction last?")
    
    # Treatment and outcome
    treatment_given = models.TextField(blank=True, help_text="What treatment was provided?")
    outcome = models.CharField(
        max_length=50,
        choices=[
            ('recovered', 'Fully Recovered'),
            ('recovering', 'Recovering'),
            ('not_recovered', 'Not Recovered'),
            ('ongoing', 'Ongoing'),
            ('unknown', 'Unknown'),
            ('permanent', 'Permanent Damage'),
            ('death', 'Death'),
        ],
        default='recovering'
    )
    
    # Reporting details
    reported_date = models.DateTimeField(auto_now_add=True)
    reported_by = models.CharField(
        max_length=20,
        choices=[
            ('patient', 'Patient'),
            ('pharmacy_admin', 'Pharmacy Admin'),
            ('healthcare_provider', 'Healthcare Provider'),
            ('family', 'Family Member'),
        ],
        default='patient'
    )
    
    # Follow-up
    requires_follow_up = models.BooleanField(default=False)
    follow_up_date = models.DateTimeField(null=True, blank=True)
    follow_up_notes = models.TextField(blank=True)
    
    # Status
    is_resolved = models.BooleanField(default=False)
    resolved_date = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = "Adverse Reaction"
        verbose_name_plural = "Adverse Reactions"
        ordering = ['-reported_date']
    
    def __str__(self):
        return f"{self.patient.username} - {self.medication_name} - {self.reaction_type}"
