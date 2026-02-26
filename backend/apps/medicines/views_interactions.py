from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import Medicine, DrugDatabase, DrugInteraction, Contraindication, UserAllergy, FoodInteraction
from .serializers import (
    MedicineSerializer, DrugDatabaseSerializer, DrugInteractionSerializer,
    ContraindicationSerializer, UserAllergySerializer, FoodInteractionSerializer,
    MedicineInteractionCheckSerializer, SafetyCheckSerializer
)
from .safety_lookup import (
    check_contraindications_rwanda_first,
    get_food_advice_rwanda_first,
    get_generic_name_from_rwanda
)


class InteractionViewSet(viewsets.ViewSet):
    """Enhanced interaction checking with population-specific warnings"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter interactions based on user's medicines"""
        user = self.request.user
        return DrugInteraction.objects.filter(
            Q(drug1__medicine__user=user) | Q(drug2__medicine__user=user)
        ).select_related('drug1', 'drug2', 'drug1__medicine', 'drug2__medicine')
    
    @action(detail=False, methods=['post'])
    def check_interactions(self, request):
        """Check for drug interactions between multiple medicines using Rwanda FDA-first strategy"""
        serializer = MedicineInteractionCheckSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        medicine_ids = serializer.validated_data['medicine_ids']
        population_type = serializer.validated_data.get('population_type')
        
        # Get user's medicines
        user_medicines = Medicine.objects.filter(
            id__in=medicine_ids,
            user=request.user
        )
        
        interactions = []
        medicine_generic_map = {}  # Cache generic names
        
        # Build generic name map using Rwanda FDA-first
        for medicine in user_medicines:
            generic_name = get_generic_name_from_rwanda(medicine.name)
            medicine_generic_map[medicine.name] = {
                'generic': generic_name,
                'rwanda_match': generic_name is not None
            }
        
        # Check drug-drug interactions using generic names
        for i, med1 in enumerate(user_medicines):
            for med2 in user_medicines[i+1:]:
                # Get generic names from Rwanda FDA
                generic1 = medicine_generic_map[med1.name]['generic'] or med1.name
                generic2 = medicine_generic_map[med2.name]['generic'] or med2.name
                
                # Check for interaction using generic names
                existing_interaction = DrugInteraction.objects.filter(
                    Q(drug1__generic_name__iexact=generic1, drug2__generic_name__iexact=generic2) |
                    Q(drug1__generic_name__iexact=generic2, drug2__generic_name__iexact=generic1) |
                    Q(drug1__name__iexact=med1.name, drug2__name__iexact=med2.name)
                ).first()
                
                if existing_interaction:
                    interactions.append({
                        'type': 'drug_interaction',
                        'medicine1': med1.name,
                        'medicine2': med2.name,
                        'generic1': generic1,
                        'generic2': generic2,
                        'severity': existing_interaction.severity,
                        'description': existing_interaction.description,
                        'management': existing_interaction.management,
                        'evidence_level': existing_interaction.evidence_level,
                        'source': 'drug_database'
                    })
        
        # Check for contraindications using Rwanda FDA-first
        if population_type:
            for medicine in user_medicines:
                contra_results = check_contraindications_rwanda_first(
                    medicine.name,
                    population_type=population_type
                )
                
                for contraindication in contra_results['contraindications']:
                    interactions.append({
                        'type': 'contraindication',
                        'medicine': medicine.name,
                        'generic_name': contra_results.get('generic_name'),
                        'rwanda_fda_match': contra_results['rwanda_fda_match'],
                        'contraindication_type': contraindication['type'],
                        'condition': contraindication['condition'],
                        'severity': contraindication['severity'],
                        'description': contraindication['description'],
                        'rationale': contraindication['rationale'],
                        'alternatives': contraindication['alternatives']
                    })
        
        # Check for food interactions using Rwanda FDA-first
        for medicine in user_medicines:
            food_result = get_food_advice_rwanda_first(medicine.name)
            
            for food_interaction in food_result['food_interactions']:
                interactions.append({
                    'type': 'food_interaction',
                    'medicine': medicine.name,
                    'generic_name': food_result.get('generic_name'),
                    'rwanda_fda_match': food_result['rwanda_fda_match'],
                    'food': food_interaction['food'],
                    'severity': food_interaction['severity'],
                    'description': food_interaction['description'],
                    'recommendation': food_interaction['recommendation']
                })
        
        return Response({
            'interactions': interactions,
            'total_checks': len(interactions),
            'population_type': population_type,
            'medicines_checked': len(user_medicines),
            'medicine_generic_map': medicine_generic_map,
            'strategy': 'rwanda_fda_first'
        })
    
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
        """Get food advice for user's medicines using Rwanda FDA-first strategy"""
        user = request.user
        medicines = Medicine.objects.filter(user=user, is_active=True)
        
        food_advice = {}
        
        for medicine in medicines:
            # Use Rwanda FDA-first strategy
            advice_result = get_food_advice_rwanda_first(medicine.name)
            
            # Get database food interactions
            food_interactions = FoodInteraction.objects.filter(medicine=medicine)
            
            # Combine Rwanda FDA advice with database interactions
            db_interactions = [
                {
                    'food': fi.food,
                    'food_category': fi.food_category,
                    'severity': fi.severity,
                    'recommendation': fi.recommendation,
                    'description': fi.description,
                    'source': 'database'
                } for fi in food_interactions
            ]
            
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
                'interactions': advice_result['food_interactions'] + db_interactions,
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
        """Get contraindications for user's population type"""
        user = request.user
        population_type = request.query_params.get('population_type', 'young')
        
        # Get user's population type from profile
        user_profile = getattr(user, 'profile', None)
        if user_profile and hasattr(user_profile, 'population_type'):
            population_type = user_profile.population_type
        
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
