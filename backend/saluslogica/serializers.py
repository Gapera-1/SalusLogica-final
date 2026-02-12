"""
Pharmacy Admin Serializers
"""

from rest_framework import serializers
from django.conf import settings
from django.contrib.auth import get_user_model
from .models import PharmacyAdmin, PatientPharmacyAssociation, AdverseReaction

User = get_user_model()


class PharmacyAdminSignupSerializer(serializers.ModelSerializer):
    """Serializer for pharmacy admin signup"""
    
    username = serializers.CharField(write_only=True)
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    
    # Location fields for ID generation
    country = serializers.CharField(write_only=True)
    province = serializers.CharField(write_only=True)
    district = serializers.CharField(write_only=True)
    
    # Facility details
    facility_name = serializers.CharField(write_only=True)
    facility_type = serializers.ChoiceField(
        choices=[('pharmacy', 'Pharmacy'), ('hospital', 'Hospital')],
        write_only=True
    )
    
    # Contact information
    phone_number = serializers.CharField(write_only=True, required=True)
    address = serializers.CharField(write_only=True, required=True)
    
    # License information
    license_number = serializers.CharField(write_only=True, required=True)
    license_expiry = serializers.DateField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = PharmacyAdmin
        fields = [
            'username', 'email', 'password', 'confirm_password',
            'country', 'province', 'district', 'facility_name', 'facility_type',
            'phone_number', 'address', 'license_number', 'license_expiry'
        ]
    
    def validate(self, attrs):
        """Validate the signup data"""
        
        # Check if passwords match
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({
                'non_field_errors': ["Passwords don't match"]
            })
        
        # Check if username already exists
        if User.objects.filter(username=attrs['username']).exists():
            raise serializers.ValidationError({
                'non_field_errors': ["Username already exists"]
            })
        
        # Check if email already exists
        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError({
                'non_field_errors': ["Email already exists"]
            })
        
        return attrs
    
    def create(self, validated_data):
        """Create pharmacy admin user and profile"""
        
        # Remove confirm_password from validated_data
        validated_data.pop('confirm_password')
        
        # Extract user data
        username = validated_data.pop('username')
        email = validated_data.pop('email')
        password = validated_data.pop('password')
        
        # Create user with create_user() method
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )
        
        # Explicitly set user_type to pharmacy_admin
        user.user_type = 'pharmacy_admin'
        user.save()
        
        # Create pharmacy admin profile
        pharmacy_admin = PharmacyAdmin.objects.create(
            user=user,
            **validated_data
        )
        
        return pharmacy_admin


class PharmacyAdminSerializer(serializers.ModelSerializer):
    """Serializer for pharmacy admin profile"""
    
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    patient_count = serializers.ReadOnlyField()
    active_patient_count = serializers.ReadOnlyField()
    
    class Meta:
        model = PharmacyAdmin
        fields = [
            'id', 'pharmacy_id', 'username', 'email', 'facility_name', 
            'facility_type', 'country', 'province', 'district', 
            'phone_number', 'address', 'license_number', 'license_expiry',
            'is_active', 'is_verified', 'patient_count', 'active_patient_count',
            'created_at'
        ]
        read_only_fields = ['pharmacy_id', 'created_at']


class PatientPharmacyAssociationSerializer(serializers.ModelSerializer):
    """Serializer for patient-pharmacy associations"""
    
    patient_username = serializers.CharField(source='patient.username', read_only=True)
    patient_email = serializers.CharField(source='patient.email', read_only=True)
    pharmacy_name = serializers.CharField(source='pharmacy_admin.facility_name', read_only=True)
    pharmacy_id = serializers.CharField(source='pharmacy_admin.pharmacy_id', read_only=True)
    
    class Meta:
        model = PatientPharmacyAssociation
        fields = [
            'id', 'patient', 'patient_username', 'patient_email',
            'pharmacy_admin', 'pharmacy_name', 'pharmacy_id',
            'assigned_date', 'is_active', 'consent_given', 'consent_date', 'notes'
        ]


class AdverseReactionSerializer(serializers.ModelSerializer):
    """Serializer for adverse reactions"""
    
    patient_username = serializers.CharField(source='patient.username', read_only=True)
    pharmacy_name = serializers.CharField(
        source='pharmacy_admin.facility_name', 
        read_only=True, 
        allow_null=True
    )
    
    class Meta:
        model = AdverseReaction
        fields = [
            'id', 'patient', 'patient_username', 'pharmacy_admin', 'pharmacy_name',
            'reaction_type', 'severity', 'medication_name', 'medication_dosage',
            'medication_batch', 'symptoms', 'onset_time', 'duration',
            'treatment_given', 'outcome', 'reported_date', 'reported_by',
            'requires_follow_up', 'follow_up_date', 'follow_up_notes',
            'is_resolved', 'resolved_date'
        ]
        read_only_fields = ['reported_date']


class AdverseReactionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating adverse reactions"""
    
    class Meta:
        model = AdverseReaction
        fields = [
            'reaction_type', 'severity', 'medication_name', 'medication_dosage',
            'medication_batch', 'symptoms', 'onset_time', 'duration',
            'treatment_given', 'outcome', 'reported_by',
            'requires_follow_up', 'follow_up_date', 'follow_up_notes'
        ]


class PharmacyAdminPatientSerializer(serializers.ModelSerializer):
    """Serializer for patients managed by pharmacy admin"""
    
    username = serializers.CharField(read_only=True)
    email = serializers.CharField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    assigned_date = serializers.DateTimeField(source='pharmacy_associations__assigned_date', read_only=True)
    is_active_association = serializers.BooleanField(source='pharmacy_associations__is_active', read_only=True)
    consent_given = serializers.BooleanField(source='pharmacy_associations__consent_given', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'assigned_date', 'is_active_association', 'consent_given'
        ]
