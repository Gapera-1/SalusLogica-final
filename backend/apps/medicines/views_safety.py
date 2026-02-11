from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import Medicine, MedicineInteraction, UserAllergy
from .serializers import (
    MedicineSerializer, UserAllergySerializer,
    MedicineInteractionCheckSerializer, SafetyCheckSerializer
)


class SafetyCheckViewSet(viewsets.ViewSet):
    """Safety check endpoints for medicine validation"""
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def safety_check(self, request):
        """Comprehensive safety check for a specific medicine"""
        serializer = SafetyCheckSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        medicine_id = serializer.validated_data['medicine_id']
        population_type = serializer.validated_data['population_type']
        
        try:
            medicine = get_object_or_404(Medicine, id=medicine_id, user=request.user)
        except Medicine.DoesNotExist:
            return Response(
                {'error': 'Medicine not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        safety_alerts = []
        
        # Clinical safety validation (from monolith)
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
        
        # Population-specific checks
        if population_type == 'pregnant':
            pregnancy_contraindicated = [
                'warfarin', 'isotretinoin', 'methotrexate', 'valproic acid',
                'ace_inhibitors', 'statins', 'tetracyclines'
            ]
            
            medicine_name_lower = medicine.name.lower()
            if any(drug in medicine_name_lower for drug in pregnancy_contraindicated):
                safety_alerts.append({
                    'type': 'pregnancy_contraindication',
                    'severity': 'critical',
                    'message': f"{medicine.name} is contraindicated for pregnancy",
                    'recommendation': "Consult with obstetrician immediately"
                })
        
        elif population_type == 'elderly':
            if medicine.dose_mg and float(medicine.dose_mg) > 500:
                safety_alerts.append({
                    'type': 'elderly_dosage',
                    'severity': 'moderate',
                    'message': f"High dose {medicine.dose_mg}mg detected for elderly patient",
                    'recommendation': "Consider dose reduction for elderly patients"
                })
        
        # Check food interactions
        food_interactions = FoodInteraction.objects.filter(medicine=medicine)
        for food_interaction in food_interactions:
            safety_alerts.append({
                'type': 'food_interaction',
                'severity': food_interaction.severity,
                'message': f"Avoid {food_interaction.food} when taking {medicine.name}",
                'recommendation': food_interaction.recommendation
            })
        
        return Response({
            'medicine': {
                'id': medicine.id,
                'name': medicine.name,
                'dosage': medicine.dosage,
                'dose_mg': medicine.dose_mg
            },
            'population_type': population_type,
            'safety_alerts': safety_alerts,
            'food_interactions': [
                {
                    'food': fi.food,
                    'food_category': fi.food_category,
                    'severity': fi.severity,
                    'recommendation': fi.recommendation
                } for fi in food_interactions
            ],
            'overall_safety': len(safety_alerts) == 0
        })
    
    @action(detail=False, methods=['get'])
    def food_advice(self, request):
        """Get food advice for user's medicines"""
        user = request.user
        medicines = Medicine.objects.filter(user=user, is_active=True)
        
        food_advice = {}
        
        for medicine in medicines:
            food_interactions = FoodInteraction.objects.filter(medicine=medicine)
            
            if food_interactions.exists():
                advice = {
                    'medicine_name': medicine.name,
                    'foods_to_avoid': medicine.food_to_avoid or [],
                    'foods_advised': medicine.food_advised or [],
                    'interactions': [
                        {
                            'food': fi.food,
                            'food_category': fi.food_category,
                            'severity': fi.severity,
                            'recommendation': fi.recommendation,
                            'description': fi.description
                        } for fi in food_interactions
                    ]
                }
                food_advice[medicine.id] = advice
        
        return Response({
            'food_advice': food_advice,
            'total_medicines': len(medicines),
            'medicines_with_food_interactions': len(food_advice)
        })
    
    @action(detail=False, methods=['get'])
    def contraindications(self, request):
        """Get contraindications for user's population type"""
        user = request.user
        population_type = request.query_params.get('population_type', 'young')
        
        contraindications = Contraindication.objects.filter(
            population_groups__contains=[population_type]
        ).select_related('drug')
        
        return Response({
            'population_type': population_type,
            'contraindications': [
                {
                    'drug': c.drug.name,
                    'contraindication_type': c.contraindication_type,
                    'condition': c.condition,
                    'severity': c.severity,
                    'description': c.description,
                    'population_groups': c.population_groups,
                    'alternatives': c.alternatives
                } for c in contraindications
            ],
            'total_contraindications': len(contraindications)
        })
