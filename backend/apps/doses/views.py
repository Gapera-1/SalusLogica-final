from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from datetime import timedelta
from .models import DoseLog, DoseHistory
from .serializers import DoseLogSerializer, DoseHistorySerializer
from .tasks import send_notification


class DoseLogViewSet(viewsets.ModelViewSet):
    serializer_class = DoseLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'medicine']
    search_fields = ['medicine__name', 'notes']
    ordering_fields = ['scheduled_time', 'created_at']
    ordering = ['-scheduled_time']
    
    def get_queryset(self):
        return DoseLog.objects.filter(medicine__user=self.request.user).select_related('medicine')
    
    @action(detail=True, methods=['post'])
    def mark_taken(self, request, pk=None):
        """Mark a dose as taken and reduce medicine stock by dose amount"""
        dose = self.get_object()
        
        # If already taken, do not double-decrement stock
        if dose.status == 'taken':
            return Response(
                {
                    'status': 'dose already marked as taken',
                    'stock_count': dose.medicine.stock_count,
                },
                status=status.HTTP_200_OK,
            )
        
        dose.status = 'taken'
        dose.taken_at = timezone.now()
        dose.save()
        
        medicine = dose.medicine
        # Safely decrement stock if tracking stock and value is positive
        if medicine.stock_count is not None and medicine.stock_count > 0:
            # Try to infer quantity from dosage text, e.g. "2 tablets"
            dosage_text = medicine.dosage or ""
            dose_quantity = 1
            
            try:
                import re
                match = re.search(r'(\d+)', dosage_text)
                if match:
                    parsed_qty = int(match.group(1))
                    if parsed_qty > 0:
                        dose_quantity = parsed_qty
            except Exception:
                # If parsing fails for any reason, fall back to 1
                dose_quantity = 1
            
            decrement = min(dose_quantity, medicine.stock_count)
            medicine.stock_count -= decrement
            
            # When stock reaches zero, make medicine inactive/completed
            if medicine.stock_count <= 0:
                medicine.stock_count = 0
                medicine.is_active = False
                medicine.completed = True
            
            medicine.save(update_fields=['stock_count', 'is_active', 'completed', 'updated_at'])
        
        return Response(
            {
                'status': 'dose marked as taken',
                'stock_count': medicine.stock_count,
            }
        )
    
    @action(detail=True, methods=['post'])
    def taken(self, request, pk=None):
        """Alias for mark_taken for frontend compatibility"""
        return self.mark_taken(request, pk)
    
    @action(detail=True, methods=['post'])
    def mark_missed(self, request, pk=None):
        """Mark a dose as missed"""
        dose = self.get_object()
        dose.status = 'missed'
        dose.dismissed_at = timezone.now()
        dose.save()
        
        return Response({'status': 'dose marked as missed'})
    
    @action(detail=True, methods=['post'])
    def missed(self, request, pk=None):
        """Alias for mark_missed for frontend compatibility"""
        return self.mark_missed(request, pk)
    
    @action(detail=True, methods=['post'])
    def snooze(self, request, pk=None):
        """Snooze a dose"""
        dose = self.get_object()
        minutes = request.data.get('snooze_minutes', request.data.get('minutes', 15))
        
        dose.status = 'snoozed'
        dose.snoozed_until = timezone.now() + timedelta(minutes=minutes)
        dose.snooze_count += 1
        dose.save()
        
        return Response({'status': f'dose snoozed for {minutes} minutes'})
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get all pending doses"""
        pending_doses = self.get_queryset().filter(status='pending')
        serializer = self.get_serializer(pending_doses, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get all doses for today"""
        today = timezone.now().date()
        today_doses = self.get_queryset().filter(scheduled_time__date=today)
        serializer = self.get_serializer(today_doses, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def check_missed(self, request):
        """Check for missed doses"""
        from .tasks import check_missed_doses
        task = check_missed_doses.delay()
        return Response({'status': 'missed dose check started', 'task_id': task.id})
    
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get all overdue doses"""
        overdue_doses = self.get_queryset().filter(
            status='pending',
            scheduled_time__lt=timezone.now()
        )
        serializer = self.get_serializer(overdue_doses, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def send_reminder(self, request, pk=None):
        """Send immediate reminder for a specific dose"""
        dose = self.get_object()
        
        send_notification.delay(
            user_id=dose.medicine.user.id,
            notification_type='manual_reminder',
            title=f'Medicine Reminder: {dose.medicine.name}',
            message=f'Time to take {dose.medicine.dosage} of {dose.medicine.name}',
            data={
                'dose_id': dose.id,
                'medicine_id': dose.medicine.id,
                'medicine_name': dose.medicine.name,
                'dosage': dose.medicine.dosage
            }
        )
        
        return Response({'status': 'reminder sent'})


class DoseHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DoseHistorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['medicine']
    ordering_fields = ['date', 'adherence_percentage']
    ordering = ['-date']
    
    def get_queryset(self):
        return DoseHistory.objects.filter(user=self.request.user).select_related('medicine')
    
    @action(detail=False, methods=['get'])
    def adherence_report(self, request):
        """Generate adherence report for a date range"""
        from django.db.models import Avg, Count
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            return Response(
                {'error': 'Both start_date and end_date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(
            date__gte=start_date,
            date__lte=end_date
        )
        
        # Calculate overall statistics
        total_doses = queryset.aggregate(
            total_scheduled=models.Sum('doses_scheduled'),
            total_taken=models.Sum('doses_taken'),
            total_missed=models.Sum('doses_missed'),
            avg_adherence=models.Avg('adherence_percentage')
        )
        
        # Daily breakdown
        daily_data = queryset.values('date').annotate(
            adherence=models.Avg('adherence_percentage'),
            scheduled=models.Sum('doses_scheduled'),
            taken=models.Sum('doses_taken')
        ).order_by('date')
        
        return Response({
            'summary': total_doses,
            'daily_breakdown': daily_data
        })
