from rest_framework import serializers
from .models import Medicine, MedicineInteraction, UserAllergy
from django.contrib.auth import get_user_model

User = get_user_model()


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
            'instructions', 'reminder_enabled', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Enhanced validation with population-specific checks"""
        # Get user population type if available
        user = self.context.get('user')
        if user and hasattr(user, 'population_type'):
            population_type = user.population_type
            
            # Pregnancy-specific validation
            if population_type == 'pregnant':
                # Check for pregnancy contraindications
                medicine_name = data.get('name', '').lower()
                pregnancy_contraindicated = [
                    'warfarin', 'isotretinoin', 'methotrexate', 'valproic acid',
                    'ace_inhibitors', 'statins', 'tetracyclines'
                ]
                
                if any(drug in medicine_name for drug in pregnancy_contraindicated):
                    raise serializers.ValidationError(
                        f"This medicine is contraindicated for pregnancy: {medicine_name}"
                    )
            
            # Elderly-specific validation
            elif population_type == 'elderly':
                # Check dosage adjustments for elderly
                dose_mg = data.get('dose_mg')
                if dose_mg and float(dose_mg) > 500:  # High dose warning
                    raise serializers.ValidationError(
                        "High dose detected for elderly patient. Please consult with doctor."
                    )
        
        return super().validate(data)
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


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
