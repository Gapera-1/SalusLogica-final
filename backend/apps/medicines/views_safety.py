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
        
        # Check contraindications from database
        drug = Drug.objects.filter(
            Q(name__iexact=medicine.name) | Q(generic_name__iexact=medicine.name)
        ).first()
        
        if drug:
            contraindications = check_contraindications(drug, patient_profile)
            
            for contra in contraindications:
                safety_alerts.append({
                    'type': 'contraindication',
                    'severity': contra.severity,
                    'population': contra.get_population_display(),
                    'condition': contra.condition,
                    'message': contra.description,
                    'source': contra.source
                })
        
        # Population-specific checks for common drugs
        if population_cat == 'pregnant':
            pregnancy_contraindicated = [
                'warfarin', 'isotretinoin', 'methotrexate', 'valproic acid',
                'ace_inhibitor', 'statin', 'tetracycline'
            ]
            
            medicine_name_lower = medicine.name.lower()
            if any(drug_name in medicine_name_lower for drug_name in pregnancy_contraindicated):
                safety_alerts.append({
                    'type': 'pregnancy_contraindication',
                    'severity': 'critical',
                    'population': 'Pregnant',
                    'message': f"{medicine.name} is contraindicated for pregnancy",
                    'recommendation': "Consult with obstetrician immediately"
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
        """Get food advice for user's medicines"""
        user = request.user
        medicines = Medicine.objects.filter(user=user, is_active=True)
        
        food_advice = {}
        
        for medicine in medicines:
            # Use built-in food interaction fields from Medicine model
            if medicine.food_to_avoid or medicine.food_advised:
                advice = {
                    'medicine_name': medicine.name,
                    'foods_to_avoid': medicine.food_to_avoid or [],
                    'foods_advised': medicine.food_advised or [],
                }
                food_advice[medicine.id] = advice
        
        return Response({
            'food_advice': food_advice,
            'total_medicines': len(medicines),
            'medicines_with_food_interactions': len(food_advice)
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
