from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import DrugInteraction, InteractionCheck, Contraindication, DrugDatabase
from .serializers import (
    DrugInteractionSerializer, 
    InteractionCheckSerializer, 
    ContraindicationSerializer,
    DrugDatabaseSerializer
)
from .tasks import check_drug_interactions, initialize_drug_database, add_common_interactions, add_common_contraindications


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
        """Check for drug interactions between specified medicines"""
        medicine_ids = request.data.get('medicine_ids', [])
        
        if len(medicine_ids) < 2:
            return Response(
                {'error': 'At least 2 medicines are required to check interactions'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Perform interaction check asynchronously
        task = check_drug_interactions.delay(request.user.id, medicine_ids)
        
        return Response({
            'message': 'Interaction check started',
            'task_id': task.id
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
            models.Q(generic_name__icontains=query) |
            models.Q(brand_names__icontains=query) |
            models.Q(drug_class__icontains=query)
        )
        
        serializer = self.get_serializer(drugs, many=True)
        return Response(serializer.data)
