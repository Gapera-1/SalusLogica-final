from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import (
    Medicine, MedicineInteraction, UserAllergy, Drug, 
    Contraindication, PatientProfile, get_population_category, check_contraindications
)
from .serializers import (
    MedicineSerializer, UserAllergySerializer,
    MedicineInteractionCheckSerializer, SafetyCheckSerializer,
    PatientProfileSerializer, ContraindicationSerializer
)
from apps.authentication.models import UserProfile
from .safety_lookup import (
    check_contraindications_rwanda_first,
    get_food_advice_rwanda_first,
    check_medicine_safety_comprehensive,
    check_medicine_for_condition
)


class SafetyCheckViewSet(viewsets.ViewSet):
    """Safety check endpoints for medicine validation"""
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def safety_check(self, request):
        """Comprehensive safety check for a specific medicine using patient profile"""
        medicine_id = request.data.get('medicine_id')
        
        if not medicine_id:
            return Response(
                {'error': 'medicine_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            medicine = get_object_or_404(Medicine, id=medicine_id, user=request.user)
        except Medicine.DoesNotExist:
            return Response(
                {'error': 'Medicine not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get patient profile from unified UserProfile model
        try:
            patient_profile = request.user.profile
        except (UserProfile.DoesNotExist, AttributeError):
            return Response({
                'error': 'No patient profile found',
                'message': 'Please complete your patient profile for safety checks',
                'medicine': {
                    'id': medicine.id,
                    'name': medicine.name,
                    'dosage': medicine.dosage
                }
            }, status=status.HTTP_400_BAD_REQUEST)
        
        safety_alerts = []
        population_cat = get_population_category(patient_profile)
        
        # Clinical safety validation (dosage checks)
        if medicine.dose_mg and medicine.weight_kg and medicine.dose_per_kg:
            expected = medicine.weight_kg * medicine.dose_per_kg
            tolerance = expected * 0.10
            if not (expected - tolerance <= medicine.dose_mg <= expected + tolerance):
                safety_alerts.append({
                    'type': 'dosage_safety',
                    'severity': 'warning',
                    'message': f"Dosage {medicine.dose_mg}mg is outside 10% safety margin for weight {medicine.weight_kg}kg",
                    'recommendation': "Consult with healthcare provider for dosage adjustment"
                })
        
        # Check contraindications using Rwanda FDA-first strategy
        population_cat = get_population_category(patient_profile)
        contra_results = check_contraindications_rwanda_first(
            medicine.name,
            population_type=population_cat
        )
        
        # Add Rwanda FDA match info
        if contra_results['rwanda_fda_match']:
            safety_alerts.append({
                'type': 'info',
                'severity': 'info',
                'message': f"Found in Rwanda FDA: {contra_results.get('generic_name', 'N/A')}",
                'source': 'rwanda_fda'
            })
        
        for contra in contra_results['contraindications']:
            # Handle both old format (with severity) and new OpenFDA format
            severity = contra.get('severity', 'warning')
            if severity == 'ABSOLUTE':
                severity = 'critical'
            elif severity not in ['critical', 'warning', 'moderate', 'info']:
                severity = 'warning'
            
            safety_alerts.append({
                'type': 'contraindication',
                'severity': severity,
                'population': ', '.join(contra.get('population_groups', [])),
                'condition': contra.get('condition', 'Unknown condition'),
                'message': contra.get('description', 'No description available'),
                'source': contra.get('source', 'drug_database')
            })
        
        # Population-specific checks for common drugs using Rwanda FDA-first
        if population_cat == 'pregnant':
            # Use the new condition-based check for pregnancy
            from .safety_lookup import check_medicine_for_condition
            condition_result = check_medicine_for_condition(
                medicine.name, 
                'pregnancy', 
                population_type='pregnant'
            )
            
            # If the medicine is unsafe for pregnancy, add an alert
            if condition_result['safety_status'] == 'UNSAFE':
                for reason in condition_result['reasons']:
                    safety_alerts.append({
                        'type': 'pregnancy_contraindication',
                        'severity': 'critical',
                        'population': 'Pregnant',
                        'message': reason.get('description', f"{medicine.name} is contraindicated for pregnancy"),
                        'recommendation': "Consult with obstetrician immediately",
                        'source': reason.get('source', 'safety_check')
                    })
            elif condition_result['safety_status'] == 'CAUTION':
                for reason in condition_result['reasons']:
                    safety_alerts.append({
                        'type': 'pregnancy_warning',
                        'severity': 'warning',
                        'population': 'Pregnant',
                        'message': reason.get('description', f"Use {medicine.name} with caution during pregnancy"),
                        'recommendation': "Consult with your doctor before use",
                        'source': reason.get('source', 'safety_check')
                    })
        
        elif population_cat == 'elderly':
            if medicine.dose_mg and float(medicine.dose_mg) > 500:
                safety_alerts.append({
                    'type': 'elderly_dosage',
                    'severity': 'moderate',
                    'population': 'Elderly (65+)',
                    'message': f"High dose {medicine.dose_mg}mg detected for elderly patient",
                    'recommendation': "Consider dose reduction for elderly patients"
                })
        
        elif population_cat in ['infant_toddler', 'child']:
            if medicine.dose_mg and not medicine.dose_per_kg:
                safety_alerts.append({
                    'type': 'pediatric_dosing',
                    'severity': 'moderate',
                    'population': 'Pediatric',
                    'message': 'Pediatric dosing should be weight-based (mg/kg)',
                    'recommendation': 'Please specify dose per kg for pediatric safety'
                })
        
        # Check food interactions using Medicine model's built-in fields
        if medicine.food_to_avoid:
            safety_alerts.append({
                'type': 'food_interaction',
                'severity': 'moderate',
                'message': f"Avoid certain foods when taking {medicine.name}",
                'recommendation': f"Foods to avoid: {', '.join(medicine.food_to_avoid)}"
            })
        
        return Response({
            'medicine': {
                'id': medicine.id,
                'name': medicine.name,
                'dosage': medicine.dosage,
                'dose_mg': medicine.dose_mg
            },
            'patient_profile': {
                'age': patient_profile.age,
                'is_pregnant': patient_profile.is_pregnant,
                'is_lactating': patient_profile.is_lactating,
                'population_category': population_cat
            },
            'safety_alerts': safety_alerts,
            'overall_safety': len(safety_alerts) == 0,
            'total_alerts': len(safety_alerts)
        })
    
    @action(detail=False, methods=['get'])
    def food_advice(self, request):
        """Get food advice for user's medicines using Rwanda FDA-first strategy"""
        user = request.user
        medicines = Medicine.objects.filter(user=user, is_active=True)
        
        food_advice = {}
        
        for medicine in medicines:
            # Use Rwanda FDA-first strategy for food advice
            advice_result = get_food_advice_rwanda_first(medicine.name)
            
            # Combine with existing medicine data
            # Convert general_advice to array if it's a string
            general_advice = advice_result['general_advice']
            if isinstance(general_advice, str) and general_advice:
                general_advice = [general_advice]
            elif not general_advice:
                general_advice = []
            
            advice = {
                'medicine_name': medicine.name,
                'generic_name': advice_result.get('generic_name'),
                'rwanda_fda_match': advice_result['rwanda_fda_match'],
                'openfda_match': advice_result['openfda_match'],
                'source': advice_result.get('source'),
                'foods_to_avoid': list(set(
                    (medicine.food_to_avoid or []) + advice_result['foods_to_avoid']
                )),
                'foods_advised': list(set(
                    (medicine.food_advised or []) + advice_result['foods_advised']
                )),
                'food_interactions': advice_result['food_interactions'],
                'general_advice': general_advice,
                'timing_advice': [],  # Frontend expects this
            }
            
            food_advice[medicine.id] = advice
        
        return Response({
            'food_advice': food_advice,
            'total_medicines': len(medicines),
            'medicines_with_food_interactions': len(food_advice),
            'strategy': 'rwanda_fda_first'
        })
    
    @action(detail=False, methods=['get'])
    def contraindications(self, request):
        """Get contraindications for user's population category based on their profile"""
        user = request.user
        
        # Get patient profile from unified UserProfile model
        try:
            patient_profile = user.profile
            population_cat = get_population_category(patient_profile)
        except (UserProfile.DoesNotExist, AttributeError):
            return Response({
                'error': 'No patient profile found',
                'message': 'Please complete your patient profile to view contraindications',
                'contraindications': []
            }, status=status.HTTP_400_BAD_REQUEST)
        
        contraindications = Contraindication.objects.filter(
            population=population_cat
        ).select_related('drug')
        
        return Response({
            'patient_profile': {
                'age': patient_profile.age,
                'is_pregnant': patient_profile.is_pregnant,
                'is_lactating': patient_profile.is_lactating,
                'population_category': population_cat
            },
            'contraindications': [
                {
                    'drug': c.drug.name,
                    'generic_name': c.drug.generic_name,
                    'condition': c.condition,
                    'severity': c.severity,
                    'description': c.description,
                    'source': c.source
                } for c in contraindications
            ],
            'total_contraindications': len(contraindications)
        })
    
    @action(detail=False, methods=['post'])
    def check_condition(self, request):
        """
        Check if a medicine is safe for a specific medical condition.
        Uses Rwanda FDA-first strategy to get generic name, then checks OpenFDA.
        """
        medicine_name = request.data.get('medicine_name')
        condition = request.data.get('condition')
        
        if not medicine_name or not condition:
            return Response({
                'error': 'Both medicine_name and condition are required',
                'example': {
                    'medicine_name': 'Aspirin',
                    'condition': 'pregnancy'
                }
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get user's population type if available
        population_type = None
        try:
            patient_profile = request.user.profile
            population_type = get_population_category(patient_profile)
        except (UserProfile.DoesNotExist, AttributeError):
            pass
        
        # Check medicine safety for the condition
        result = check_medicine_for_condition(
            medicine_name=medicine_name,
            condition=condition,
            population_type=population_type
        )
        
        return Response({
            'medicine_name': result['medicine_name'],
            'condition': result['condition'],
            'generic_name': result['generic_name'],
            'rwanda_fda_match': result['rwanda_fda_match'],
            'openfda_match': result['openfda_match'],
            'is_safe': result['is_safe'],
            'safety_status': result['safety_status'],
            'recommendation': result['recommendation'],
            'reasons': result['reasons'],
            'alternatives': result['alternatives'],
            'source': result['source'],
            'strategy': 'rwanda_fda_first'
        })
    
    @action(detail=False, methods=['post'])
    def check_all_medicines_for_condition(self, request):
        """
        Check all user's medicines for safety with a specific condition.
        Returns a summary of which medicines are safe/unsafe.
        """
        condition = request.data.get('condition')
        
        if not condition:
            return Response({
                'error': 'condition is required',
                'example': {'condition': 'diabetes'}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user = request.user
        medicines = Medicine.objects.filter(user=user, is_active=True)
        
        # Get user's population type
        population_type = None
        try:
            patient_profile = user.profile
            population_type = get_population_category(patient_profile)
        except (UserProfile.DoesNotExist, AttributeError):
            pass
        
        # Check each medicine
        medicine_checks = []
        safe_medicines = []
        unsafe_medicines = []
        caution_medicines = []
        
        for medicine in medicines:
            result = check_medicine_for_condition(
                medicine_name=medicine.name,
                condition=condition,
                population_type=population_type
            )
            
            medicine_checks.append({
                'medicine_id': medicine.id,
                'medicine_name': medicine.name,
                'generic_name': result['generic_name'],
                'safety_status': result['safety_status'],
                'is_safe': result['is_safe'],
                'recommendation': result['recommendation'],
                'reasons': result['reasons'],
                'alternatives': result['alternatives'],
                'rwanda_fda_match': result['rwanda_fda_match'],
                'openfda_match': result['openfda_match'],
            })
            
            if result['safety_status'] == 'SAFE':
                safe_medicines.append(medicine.name)
            elif result['safety_status'] == 'UNSAFE':
                unsafe_medicines.append(medicine.name)
            else:
                caution_medicines.append(medicine.name)
        
        # Generate summary
        summary = {
            'total_medicines': len(medicines),
            'safe_count': len(safe_medicines),
            'unsafe_count': len(unsafe_medicines),
            'caution_count': len(caution_medicines),
            'safe_medicines': safe_medicines,
            'unsafe_medicines': unsafe_medicines,
            'caution_medicines': caution_medicines,
        }
        
        return Response({
            'condition': condition,
            'population_type': population_type,
            'summary': summary,
            'medicine_checks': medicine_checks,
            'strategy': 'rwanda_fda_first'
        })
