from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action, api_view, permission_classes as perm_classes, parser_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.shortcuts import get_object_or_404
from .models import Medicine, MedicineInteraction, UserAllergy, PatientProfile
from .serializers import MedicineSerializer, UserAllergySerializer, PatientProfileSerializer
from apps.authentication.models import UserProfile
from saluslogica.throttles import MedicineCreationRateThrottle


class MedicineViewSet(viewsets.ModelViewSet):
    serializer_class = MedicineSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['frequency', 'is_active', 'completed']
    search_fields = ['name', 'scientific_name', 'prescribed_for', 'prescribing_doctor']
    ordering_fields = ['created_at', 'name', 'start_date']
    ordering = ['-created_at']
    
    def get_throttles(self):
        """Apply medicine creation throttle only to POST requests"""
        if self.action == 'create':
            return [MedicineCreationRateThrottle()]
        return super().get_throttles()
    
    def get_queryset(self):
        return Medicine.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        """Ensure user is set when creating medicine"""
        serializer.save(user=self.request.user)
    
    def perform_update(self, serializer):
        """Auto-delete medicine when stock reaches 0"""
        instance = serializer.save()
        
        # Auto-delete when stock is 0
        if instance.stock_count == 0 or instance.stock_count is None:
            instance.delete()
    
    def destroy(self, request, *args, **kwargs):
        """Override destroy to handle deletion properly"""
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    def perform_destroy(self, instance):
        """Delete medicine"""
        try:
            instance.delete()
        except Exception as e:
            import traceback
            print(f"Error deleting medicine: {str(e)}")
            print(traceback.format_exc())
            raise
    
    def list(self, request, *args, **kwargs):
        """Override list method to exclude zero-stock items"""
        queryset = self.get_queryset()
        # Automatically exclude medicines with zero stock from list
        queryset = queryset.exclude(stock_count=0).exclude(stock_count__isnull=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_completed(self, request, pk=None):
        medicine = self.get_object()
        medicine.completed = True
        medicine.is_active = False
        medicine.save()
        return Response({'status': 'medicine marked as completed'})
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        medicine = self.get_object()
        medicine.is_active = not medicine.is_active
        medicine.save()
        return Response({'status': f'medicine {"activated" if medicine.is_active else "deactivated"}'})
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all active medicines for the current user"""
        active_medicines = self.get_queryset().filter(is_active=True, completed=False)
        serializer = self.get_serializer(active_medicines, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Get medicines with low stock (less than 10)"""
        low_stock_medicines = self.get_queryset().filter(stock_count__lt=10, is_active=True)
        serializer = self.get_serializer(low_stock_medicines, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def search_by_name(self, request):
        """
        Search medicines by name or scientific name.
        
        Query Parameters:
        - q: Search query (required)
        - active_only: Filter only active medicines (default: false)
        
        Examples:
        - /api/medicines/search_by_name/?q=aspirin
        - /api/medicines/search_by_name/?q=paracetamol&active_only=true
        """
        search_query = request.query_params.get('q', '').strip()
        active_only = request.query_params.get('active_only', 'false').lower() == 'true'
        
        if not search_query:
            return Response(
                {'error': 'Search query parameter "q" is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get base queryset (user's medicines)
        queryset = self.get_queryset()
        
        # Apply active filter if requested
        if active_only:
            queryset = queryset.filter(is_active=True, completed=False)
        
        # Exclude zero-stock items
        queryset = queryset.exclude(stock_count=0).exclude(stock_count__isnull=True)
        
        # Search by name or scientific name (case-insensitive)
        from django.db.models import Q
        queryset = queryset.filter(
            Q(name__icontains=search_query) | 
            Q(scientific_name__icontains=search_query)
        )
        
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'query': search_query,
            'count': len(serializer.data),
            'results': serializer.data
        })


# class MedicineInteractionViewSet(viewsets.ModelViewSet):
#     serializer_class = MedicineInteractionSerializer
#     permission_classes = [IsAuthenticated]
#     
#     def get_queryset(self):
#         # Get interactions for user's medicines
#         user_medicines = Medicine.objects.filter(user=self.request.user)
#         return MedicineInteraction.objects.filter(
#             models.Q(medicine1__in=user_medicines) | 
#             models.Q(medicine2__in=user_medicines)
#         ).distinct()


class UserAllergyViewSet(viewsets.ModelViewSet):
    serializer_class = UserAllergySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return UserAllergy.objects.filter(user=self.request.user)


class PatientProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing patient clinical profiles.
    
    Note: This now uses UserProfile from authentication app (unified model).
    Kept for API backward compatibility with medicines app endpoints.
    """
    serializer_class = PatientProfileSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'put', 'patch', 'head', 'options']  # No delete
    
    def get_queryset(self):
        # User can only access their own profile
        return UserProfile.objects.filter(user=self.request.user)
    
    def get_object(self):
        """Get or create patient profile for current user"""
        profile, created = UserProfile.objects.get_or_create(
            user=self.request.user
        )
        return profile
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user's patient profile (creates if doesn't exist)"""
        profile = self.get_object()
        serializer = self.get_serializer(profile)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post', 'put', 'patch'])
    def update_me(self, request):
        """Update current user's patient profile"""
        profile = self.get_object()
        serializer = self.get_serializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """Override create to ensure user field is set"""
        # Check if profile already exists
        existing = UserProfile.objects.filter(user=request.user).first()
        if existing:
            return Response(
                {'error': 'Patient profile already exists. Use PUT/PATCH to update.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def perform_update(self, serializer):
        """Ensure user field is preserved on update"""
        serializer.save(user=self.request.user)


# ── Barcode Lookup & Medicine Photo ──────────────────────────────────────────

@api_view(['GET'])
@perm_classes([IsAuthenticated])
def barcode_lookup(request):
    """
    Look up medicine details by barcode (UPC/EAN/NDC).

    Query Parameters:
        barcode (str): The barcode number to look up.

    Returns auto-fill fields: name, scientific_name, dosage, instructions, notes, etc.
    """
    barcode = request.query_params.get('barcode', '').strip()
    if not barcode:
        return Response(
            {'error': 'Query parameter "barcode" is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    from .barcode_lookup import lookup_by_barcode
    result = lookup_by_barcode(barcode)

    if not result:
        return Response(
            {'found': False, 'message': 'No medicine found for this barcode.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response({'found': True, 'medicine': result})


@api_view(['GET'])
@perm_classes([IsAuthenticated])
def medicine_search_external(request):
    """
    Search external drug databases by medicine name.

    Query Parameters:
        q (str): Medicine name to search for.

    Returns up to 5 matches with auto-fill fields.
    """
    query = request.query_params.get('q', '').strip()
    if not query:
        return Response(
            {'error': 'Query parameter "q" is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    from .barcode_lookup import lookup_by_name
    results = lookup_by_name(query)

    return Response({
        'query': query,
        'count': len(results),
        'results': results,
    })


@api_view(['POST'])
@perm_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_medicine_photo(request, pk):
    """
    Upload a photo for a specific medicine.

    Accepts multipart form data with a 'photo' field.
    """
    medicine = get_object_or_404(Medicine, pk=pk, user=request.user)

    photo = request.FILES.get('photo')
    if not photo:
        return Response(
            {'error': 'No photo file provided.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate file type
    allowed_types = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    if photo.content_type not in allowed_types:
        return Response(
            {'error': f'Invalid file type. Allowed: {", ".join(allowed_types)}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate file size (max 10 MB)
    if photo.size > 10 * 1024 * 1024:
        return Response(
            {'error': 'File too large. Maximum size is 10 MB.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Delete old photo if exists
    if medicine.medicine_photo:
        medicine.medicine_photo.delete(save=False)

    medicine.medicine_photo = photo
    medicine.save(update_fields=['medicine_photo', 'updated_at'])

    serializer = MedicineSerializer(medicine, context={'request': request})
    return Response({
        'message': 'Photo uploaded successfully.',
        'medicine_photo': request.build_absolute_uri(medicine.medicine_photo.url),
    })


@api_view(['DELETE'])
@perm_classes([IsAuthenticated])
def delete_medicine_photo(request, pk):
    """Remove photo from a medicine."""
    medicine = get_object_or_404(Medicine, pk=pk, user=request.user)

    if medicine.medicine_photo:
        medicine.medicine_photo.delete(save=False)
        medicine.medicine_photo = None
        medicine.save(update_fields=['medicine_photo', 'updated_at'])

    return Response({'message': 'Photo removed.'}, status=status.HTTP_200_OK)
