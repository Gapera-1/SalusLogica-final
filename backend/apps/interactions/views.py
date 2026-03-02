import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import DrugInteraction, InteractionCheck, Contraindication, DrugDatabase
from .serializers import (
    DrugInteractionSerializer, 
    InteractionCheckSerializer, 
    ContraindicationSerializer,
    DrugDatabaseSerializer
)
from .tasks import initialize_drug_database, add_common_interactions, add_common_contraindications

logger = logging.getLogger(__name__)


class DrugInteractionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DrugInteractionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['interaction_type', 'severity']
    search_fields = ['medicine1', 'medicine2', 'description']
    ordering_fields = ['severity', 'medicine1', 'medicine2']
    ordering = ['-severity']
    
    def get_queryset(self):
        return DrugInteraction.objects.all()


class InteractionCheckViewSet(viewsets.ModelViewSet):
    serializer_class = InteractionCheckSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [OrderingFilter]
    ordering = ['-check_date']
    
    def get_queryset(self):
        return InteractionCheck.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def check(self, request):
        """
        Synchronous interaction check using Rwanda FDA-first strategy.
        
        Checks:
        1. Drug-drug interactions (local DB by generic name)
        2. Drug-drug interactions from OpenFDA label data
        3. Food interactions (Rwanda FDA -> OpenFDA -> pattern fallback)
        4. Contraindications (Rwanda FDA -> OpenFDA)
        
        Returns results directly so the frontend can display them immediately.
        """
        medicine_ids = request.data.get('medicine_ids', [])
        
        if len(medicine_ids) < 2:
            return Response(
                {'error': 'At least 2 medicines are required to check interactions'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Import medicine model and safety lookup utilities
        from apps.medicines.models import Medicine
        from apps.medicines.safety_lookup import (
            get_generic_name_from_rwanda,
            fetch_openfda_safety_info,
            get_food_advice_rwanda_first,
            check_contraindications_rwanda_first,
        )
        
        # Get user's medicines
        user_medicines = Medicine.objects.filter(
            id__in=medicine_ids, user=request.user
        )
        
        if user_medicines.count() < 2:
            return Response(
                {'error': 'At least 2 valid medicines are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        interactions = []
        contraindications_list = []
        food_interactions_list = []
        medicine_generic_map = {}
        
        # ----- Step 1: Build generic name map using Rwanda FDA-first -----
        for medicine in user_medicines:
            generic_name = get_generic_name_from_rwanda(medicine.name)
            medicine_generic_map[medicine.name] = {
                'generic': generic_name or medicine.name,
                'rwanda_match': generic_name is not None,
            }
        
        # ----- Step 2: Check pairwise drug-drug interactions -----
        medicine_list = list(user_medicines)
        for i, med1 in enumerate(medicine_list):
            for med2 in medicine_list[i + 1:]:
                generic1 = medicine_generic_map[med1.name]['generic']
                generic2 = medicine_generic_map[med2.name]['generic']
                
                # 2a. Check local interactions DB (apps.interactions.DrugInteraction)
                local_interaction = DrugInteraction.objects.filter(
                    Q(medicine1__icontains=generic1, medicine2__icontains=generic2) |
                    Q(medicine1__icontains=generic2, medicine2__icontains=generic1) |
                    Q(medicine1__icontains=med1.name, medicine2__icontains=med2.name) |
                    Q(medicine1__icontains=med2.name, medicine2__icontains=med1.name)
                ).order_by('-severity').first()
                
                if local_interaction:
                    interactions.append({
                        'medicine1': med1.name,
                        'medicine2': med2.name,
                        'severity': local_interaction.severity.upper(),
                        'description': local_interaction.description,
                        'recommendation': local_interaction.recommendation,
                        'mechanism': f'{generic1} + {generic2} interaction',
                        'source': 'local_database',
                    })
                    continue  # Skip OpenFDA if local match found
                
                # 2b. Check apps.medicines DrugInteraction (Rwanda FDA model)
                try:
                    from apps.medicines.models import DrugInteraction as MedDrugInteraction, DrugDatabase as MedDrugDB
                    med_interaction = MedDrugInteraction.objects.filter(
                        Q(drug1__generic_name__iexact=generic1, drug2__generic_name__iexact=generic2) |
                        Q(drug1__generic_name__iexact=generic2, drug2__generic_name__iexact=generic1)
                    ).first()
                    
                    if med_interaction:
                        interactions.append({
                            'medicine1': med1.name,
                            'medicine2': med2.name,
                            'severity': (med_interaction.severity or 'MODERATE').upper(),
                            'description': med_interaction.description or '',
                            'recommendation': med_interaction.management or '',
                            'mechanism': med_interaction.mechanism or f'{generic1} + {generic2} interaction',
                            'source': 'drug_database',
                        })
                        continue
                except Exception as exc:
                    logger.debug(f'Medicines DrugInteraction lookup skipped: {exc}')
                
                # 2c. Cross-reference OpenFDA drug_interactions text
                try:
                    safety1 = fetch_openfda_safety_info(generic1)
                    drug_int_text = ' '.join(safety1.get('drug_interactions', []))
                    if drug_int_text and generic2.lower() in drug_int_text.lower():
                        interactions.append({
                            'medicine1': med1.name,
                            'medicine2': med2.name,
                            'severity': 'MODERATE',
                            'description': f'OpenFDA reports a potential interaction between {generic1} and {generic2}.',
                            'recommendation': 'Consult your healthcare provider about taking these together.',
                            'mechanism': f'Mentioned in {generic1} drug interaction labeling.',
                            'source': 'openfda',
                        })
                except Exception as exc:
                    logger.debug(f'OpenFDA cross-check failed: {exc}')
        
        # ----- Step 3: Food interactions for each medicine -----
        for medicine in user_medicines:
            try:
                food_result = get_food_advice_rwanda_first(medicine.name)
                for fi in food_result.get('food_interactions', []):
                    food_interactions_list.append({
                        'medicine': medicine.name,
                        'food': fi.get('food', fi.get('description', '')),
                        'severity': fi.get('severity', 'MINOR'),
                        'description': fi.get('description', ''),
                        'recommendation': fi.get('recommendation', ''),
                        'source': food_result.get('source', 'pattern_fallback'),
                    })
            except Exception as exc:
                logger.debug(f'Food advice lookup failed for {medicine.name}: {exc}')
        
        # ----- Step 4: Contraindications -----
        for medicine in user_medicines:
            try:
                contra_result = check_contraindications_rwanda_first(medicine.name)
                for c in contra_result.get('contraindications', []):
                    contraindications_list.append({
                        'medicine': medicine.name,
                        'condition': c.get('condition', c.get('type', '')),
                        'severity': c.get('severity', 'MODERATE'),
                        'description': c.get('description', ''),
                        'source': contra_result.get('source', 'openfda'),
                    })
            except Exception as exc:
                logger.debug(f'Contraindication lookup failed for {medicine.name}: {exc}')
        
        # ----- Save check record -----
        try:
            InteractionCheck.objects.create(
                user=request.user,
                medicines=list(user_medicines.values_list('name', flat=True)),
                interactions_found=interactions,
            )
        except Exception as exc:
            logger.warning(f'Failed to save interaction check record: {exc}')
        
        return Response({
            'interactions': interactions,
            'food_interactions': food_interactions_list,
            'contraindications': contraindications_list,
            'total_interactions': len(interactions),
            'medicines_checked': list(user_medicines.values_list('name', flat=True)),
            'medicine_generic_map': medicine_generic_map,
            'strategy': 'rwanda_fda_first',
        })
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get interaction check history"""
        checks = self.get_queryset()[:10]  # Last 10 checks
        serializer = self.get_serializer(checks, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def details(self, request, pk=None):
        """Get detailed results of a specific interaction check"""
        check = self.get_object()
        return Response({
            'check_id': check.id,
            'medicines': check.medicines,
            'interactions_found': check.interactions_found,
            'check_date': check.check_date,
            'total_interactions': len(check.interactions_found)
        })


class ContraindicationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ContraindicationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['severity']
    search_fields = ['medicine', 'condition', 'description']
    ordering_fields = ['severity', 'medicine', 'condition']
    ordering = ['-severity']
    
    def get_queryset(self):
        return Contraindication.objects.all()
    
    @action(detail=False, methods=['post'])
    def add_allergy(self, request):
        """Add user allergy (creates a contraindication record)"""
        from apps.medicines.models import UserAllergy
        
        data = {
            'user': request.user,
            'allergen': request.data.get('allergen'),
            'severity': request.data.get('severity', 'medium'),
            'reaction': request.data.get('reaction', '')
        }
        
        allergy = UserAllergy.objects.create(**data)
        
        return Response({
            'message': 'Allergy added successfully',
            'allergy_id': allergy.id
        })
    
    @action(detail=False, methods=['delete'])
    def delete_allergy(self, request):
        """Delete user allergy"""
        from apps.medicines.models import UserAllergy
        
        allergy_id = request.data.get('allergy_id')
        try:
            allergy = UserAllergy.objects.get(id=allergy_id, user=request.user)
            allergy.delete()
            return Response({'message': 'Allergy deleted successfully'})
        except UserAllergy.DoesNotExist:
            return Response(
                {'error': 'Allergy not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class DrugDatabaseViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DrugDatabaseSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['generic_name', 'brand_names', 'drug_class']
    ordering_fields = ['generic_name', 'drug_class']
    ordering = ['generic_name']
    
    def get_queryset(self):
        return DrugDatabase.objects.filter(is_active=True)
    
    @action(detail=False, methods=['post'])
    def initialize_database(self, request):
        """Initialize the drug database with common medications"""
        if request.user.user_type not in ['pharmacy_admin', 'doctor']:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Initialize drug database
        drug_task = initialize_drug_database.delay()
        interaction_task = add_common_interactions.delay()
        contraindication_task = add_common_contraindications.delay()
        
        return Response({
            'message': 'Drug database initialization started',
            'tasks': {
                'drugs': drug_task.id,
                'interactions': interaction_task.id,
                'contraindications': contraindication_task.id
            }
        })
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search for drugs in the database"""
        query = request.query_params.get('q', '')
        
        if not query:
            return Response(
                {'error': 'Search query is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        drugs = self.get_queryset().filter(
            Q(generic_name__icontains=query) |
            Q(brand_names__icontains=query) |
            Q(drug_class__icontains=query)
        )
        
        serializer = self.get_serializer(drugs, many=True)
        return Response(serializer.data)
