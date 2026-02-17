from rest_framework import serializers
from django.db.models import Q
from .models import (
    Medicine, MedicineInteraction, UserAllergy, Drug, 
    Contraindication, PatientProfile, get_population_category, check_contraindications
)
from django.contrib.auth import get_user_model
from apps.authentication.models import UserProfile

User = get_user_model()


class DrugSerializer(serializers.ModelSerializer):
    """Drug serializer for contraindication checking"""
    
    class Meta:
        model = Drug
        fields = [
            'id', 'name', 'generic_name', 'atc_code',
            'is_registered_in_rwanda', 'is_essential_in_rwanda',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ContraindicationSerializer(serializers.ModelSerializer):
    """Contraindication serializer with proper field mapping"""
    drug_name = serializers.CharField(source='drug.name', read_only=True)
    population_display = serializers.CharField(source='get_population_display', read_only=True)
    
    class Meta:
        model = Contraindication
        fields = [
            'id', 'drug', 'drug_name', 'population', 'population_display',
            'condition', 'severity', 'description', 'source', 'last_updated'
        ]
        read_only_fields = ['id', 'last_updated']


class PatientProfileSerializer(serializers.ModelSerializer):
    """
    Patient profile serializer for clinical decision support.
    
    Note: This now uses UserProfile from authentication app (unified model).
    Kept for API backward compatibility. Exposes only clinical safety fields.
    """
    username = serializers.CharField(source='user.username', read_only=True)
    population_category = serializers.SerializerMethodField()
    
    class Meta:
        model = UserProfile
        fields = [
            'id', 'user', 'username', 'age', 'is_pregnant', 'is_lactating',
            'population_category', 'medical_conditions', 'allergies',
            'weight_kg', 'height_cm', 'age_category', 'gender'
        ]
        read_only_fields = ['id', 'user', 'username', 'population_category']
    
    def get_population_category(self, obj):
        """Get the computed population category"""
        return get_population_category(obj)
    
    def validate_age(self, value):
        """Validate age is in reasonable range"""
        if value is not None and (value < 0 or value > 150):
            raise serializers.ValidationError("Age must be between 0 and 150")
        return value
    
    def validate(self, data):
        """Additional validation logic"""
        # Children cannot be pregnant or lactating
        age = data.get('age')
        is_pregnant = data.get('is_pregnant', False)
        is_lactating = data.get('is_lactating', False)
        
        if age and age < 12:
            if is_pregnant or is_lactating:
                raise serializers.ValidationError(
                    "Children under 12 cannot be marked as pregnant or lactating"
                )
        
        return data


class MedicineSerializer(serializers.ModelSerializer):
    """Enhanced Medicine serializer with food interactions and safety checks"""
    
    class Meta:
        model = Medicine
        fields = [
            'id', 'name', 'scientific_name', 'dosage', 'frequency', 'times', 'posology',
            'duration', 'dose_mg', 'weight_kg', 'dose_per_kg',
            'food_to_avoid', 'food_advised', 'start_date', 'end_date',
            'taken_times', 'last_notified', 'is_active', 'completed',
            'stock_count', 'prescribed_for', 'prescribing_doctor',
            'instructions', 'notes', 'reminder_enabled', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Enhanced validation with population-specific contraindication checks"""
        request = self.context.get('request')
        if not request:
            return data
        
        user = request.user
        
        # Get patient profile from unified UserProfile model
        try:
            patient_profile = user.profile
        except (UserProfile.DoesNotExist, AttributeError):
            # If no profile exists, warn but allow
            data['_warnings'] = [{
                'type': 'no_profile',
                'severity': 'warning',
                'message': 'No patient profile found. Safety checks cannot be performed.',
                'recommendation': 'Please complete your patient profile for safety checks.'
            }]
            return data
        
        # Check contraindications against actual Drug database
        medicine_name = data.get('name', '')
        warnings = []
        
        # Try to find matching drug in database
        drug = Drug.objects.filter(
            Q(name__iexact=medicine_name) | Q(generic_name__iexact=medicine_name)
        ).first()
        
        if drug:
            # Check contraindications using helper function
            contraindications = check_contraindications(drug, patient_profile)
            
            if contraindications.exists():
                for contra in contraindications:
                    warnings.append({
                        'type': 'contraindication',
                        'severity': contra.severity,
                        'population': contra.get_population_display(),
                        'condition': contra.condition,
                        'message': contra.description,
                        'source': contra.source
                    })
        
        # Additional population-based checks for common drugs
        population_cat = get_population_category(patient_profile)
        
        if population_cat == 'pregnant':
            pregnancy_risk_drugs = [
                'warfarin', 'isotretinoin', 'methotrexate', 'valproic acid',
                'ace inhibitor', 'statin', 'tetracycline'
            ]
            medicine_lower = medicine_name.lower()
            if any(drug in medicine_lower for drug in pregnancy_risk_drugs):
                warnings.append({
                    'type': 'pregnancy_risk',
                    'severity': 'absolute',
                    'population': 'Pregnant',
                    'condition': 'Pregnancy',
                    'message': f'{medicine_name} may be contraindicated during pregnancy.',
                    'source': 'Common pregnancy contraindications'
                })
        
        elif population_cat in ['infant_toddler', 'child']:
            # Dosage safety for children
            dose_mg = data.get('dose_mg')
            weight_kg = data.get('weight_kg')
            if dose_mg and weight_kg:
                # Pediatric dosing should be weight-based
                if not data.get('dose_per_kg'):
                    warnings.append({
                        'type': 'pediatric_dosing',
                        'severity': 'relative',
                        'population': 'Pediatric',
                        'condition': 'Weight-based dosing required',
                        'message': 'Pediatric dosing should be weight-based (mg/kg).',
                        'source': 'Pediatric safety guidelines'
                    })
        
        elif population_cat == 'elderly':
            dose_mg = data.get('dose_mg')
            if dose_mg and float(dose_mg) > 500:
                warnings.append({
                    'type': 'elderly_dosing',
                    'severity': 'relative',
                    'population': 'Elderly (65+)',
                    'condition': 'High dose for elderly',
                    'message': f'High dose ({dose_mg}mg) detected for elderly patient.',
                    'source': 'Geriatric dosing guidelines'
                })
        
        # Store warnings in data for later retrieval
        if warnings:
            data['_warnings'] = warnings
        
        return data
    
    def create(self, validated_data):
        # Extract warnings before saving (they're not model fields)
        warnings = validated_data.pop('_warnings', [])
        
        # User is already set by perform_create in the view
        # via serializer.save(user=request.user)
        instance = super().create(validated_data)
        
        # Attach warnings to instance for response serialization
        instance._contraindication_warnings = warnings
        
        return instance
    
    def to_representation(self, instance):
        """Add warnings to response if they exist"""
        representation = super().to_representation(instance)
        
        # Include warnings if they were generated during creation
        if hasattr(instance, '_contraindication_warnings'):
            representation['safety_warnings'] = instance._contraindication_warnings
        
        return representation


# class DrugDatabaseSerializer(serializers.ModelSerializer):
#     """Drug database serializer for interaction checking"""
#     
#     class Meta:
#         model = DrugDatabase
#         fields = [
#             'id', 'name', 'generic_name', 'brand_names', 'drug_class',
#             'description', 'categories', 'is_prescription_only',
#             'requires_monitoring', 'max_daily_dose', 'fda_approved',
#             'active_ingredients', 'created_at', 'updated_at'
#         ]
#         read_only_fields = ['id', 'created_at', 'updated_at']


# class DrugInteractionSerializer(serializers.ModelSerializer):
#     """Drug interaction serializer"""
#     
#     class Meta:
#         model = DrugInteraction
#         fields = [
#             'id', 'drug1', 'drug2', 'severity', 'description',
#             'mechanism', 'symptoms', 'management', 'onset_time',
#             'duration', 'evidence_level', 'created_at', 'updated_at'
#         ]
#         read_only_fields = ['id', 'created_at', 'updated_at']


# class ContraindicationSerializer(serializers.ModelSerializer):
#     """Contraindication serializer with population-specific warnings"""
#     
#     class Meta:
#         model = Contraindication
#         fields = [
#             'id', 'drug', 'contraindication_type', 'condition',
#             'population_groups', 'severity', 'description', 'rationale',
#             'alternatives', 'created_at', 'updated_at'
#         ]
#         read_only_fields = ['id', 'created_at', 'updated_at']


class UserAllergySerializer(serializers.ModelSerializer):
    """User allergy serializer"""
    
    class Meta:
        model = UserAllergy
        fields = [
            'id', 'user', 'allergen', 'severity', 'reaction',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


# class FoodInteractionSerializer(serializers.ModelSerializer):
#     """Food interaction serializer"""
#     
#     class Meta:
#         model = FoodInteraction
#         fields = [
#             'id', 'medicine', 'food', 'food_category', 'severity',
#             'description', 'symptoms', 'management', 'onset_time',
#             'duration', 'recommendation', 'created_at', 'updated_at'
#         ]
#         read_only_fields = ['id', 'created_at', 'updated_at']


class MedicineInteractionCheckSerializer(serializers.Serializer):
    """Serializer for checking medicine interactions"""
    
    medicine_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True,
        help_text="List of medicine IDs to check for interactions"
    )
    
    population_type = serializers.CharField(
        max_length=20,
        required=False,
        help_text="Patient population type for specific checks"
    )
    
    def validate(self, data):
        """Validate interaction check request"""
        medicine_ids = data.get('medicine_ids', [])
        if len(medicine_ids) < 2:
            raise serializers.ValidationError(
                "At least 2 medicines are required for interaction checking"
            )
        
        if len(medicine_ids) > 10:
            raise serializers.ValidationError(
                "Maximum 10 medicines can be checked at once"
            )
        
        return data


class SafetyCheckSerializer(serializers.Serializer):
    """Serializer for comprehensive safety checks"""
    
    medicine_id = serializers.IntegerField(required=True)
    population_type = serializers.CharField(
        max_length=20,
        required=True,
        help_text="Population type for safety validation"
    )
    
    def validate(self, data):
        """Validate safety check request"""
        population_type = data.get('population_type')
        valid_populations = ['young', 'pregnant', 'elderly', 'extreme']
        
        if population_type not in valid_populations:
            raise serializers.ValidationError(
                f"Invalid population type. Must be one of: {', '.join(valid_populations)}"
            )
        
        return data
