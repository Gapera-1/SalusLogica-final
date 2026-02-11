from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.shortcuts import get_object_or_404
from .models import Medicine, MedicineInteraction, UserAllergy
from .serializers import MedicineSerializer, UserAllergySerializer


class MedicineViewSet(viewsets.ModelViewSet):
    serializer_class = MedicineSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['frequency', 'is_active', 'completed']
    search_fields = ['name', 'prescribed_for', 'prescribing_doctor']
    ordering_fields = ['created_at', 'name', 'start_date']
    ordering = ['-created_at']
    
    def get_queryset(self):
        return Medicine.objects.filter(user=self.request.user)
    
    def list(self, request, *args, **kwargs):
        """Override list method to ensure proper response format"""
        queryset = self.get_queryset()
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
