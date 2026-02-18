from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes as perm_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from django.http import HttpResponse
from django.db.models import Avg, Sum, Count
from datetime import timedelta

from .models import DashboardStats, AdherenceReport, MedicineUsageStats, ExportRequest
from .serializers import (
    DashboardStatsSerializer, 
    AdherenceReportSerializer, 
    MedicineUsageStatsSerializer,
    ExportRequestSerializer
)
from .tasks import process_export_request


class DashboardStatsViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DashboardStatsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return DashboardStats.objects.filter(user=self.request.user)
    
    def get_object(self):
        stats, created = DashboardStats.objects.get_or_create(
            user=self.request.user,
            defaults={
                'total_medicines': 0,
                'active_medicines': 0,
                'doses_today': 0,
                'doses_taken_today': 0,
                'adherence_rate': 0,
                'missed_doses_week': 0,
                'streak_days': 0,
            }
        )
        return stats
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get comprehensive dashboard data"""
        stats = self.get_object()
        serializer = self.get_serializer(stats)
        
        # Get recent adherence trends
        from apps.doses.models import DoseHistory
        thirty_days_ago = timezone.now().date() - timedelta(days=30)
        recent_history = DoseHistory.objects.filter(
            user=request.user,
            date__gte=thirty_days_ago
        ).order_by('date')
        
        adherence_trends = []
        for record in recent_history:
            adherence_trends.append({
                'date': record.date,
                'adherence_percentage': record.adherence_percentage,
                'doses_taken': record.doses_taken,
                'doses_scheduled': record.doses_scheduled
            })
        
        return Response({
            'stats': serializer.data,
            'adherence_trends': adherence_trends
        })


class AdherenceReportViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AdherenceReportSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['period', 'medicine']
    ordering_fields = ['start_date', 'adherence_percentage']
    ordering = ['-start_date']
    
    def get_queryset(self):
        return AdherenceReport.objects.filter(user=self.request.user).select_related('medicine')
    
    @action(detail=False, methods=['get'])
    def patient_adherence(self, request):
        """Get adherence data for a specific patient (for pharmacy admins/doctors)"""
        if request.user.user_type not in ['pharmacy_admin', 'doctor']:
            return Response(
                {'error': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        patient_id = request.query_params.get('patient_id')
        period = request.query_params.get('period', 'monthly')
        
        if not patient_id:
            return Response(
                {'error': 'patient_id parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            patient = User.objects.get(id=patient_id)
            
            reports = AdherenceReport.objects.filter(
                user=patient,
                period=period
            ).order_by('-start_date')
            
            serializer = self.get_serializer(reports, many=True)
            return Response(serializer.data)
            
        except User.DoesNotExist:
            return Response(
                {'error': 'Patient not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )


class MedicineUsageStatsViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MedicineUsageStatsSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['medicine']
    ordering_fields = ['date', 'adherence_rate']
    ordering = ['-date']
    
    def get_queryset(self):
        return MedicineUsageStats.objects.filter(
            medicine__user=self.request.user
        ).select_related('medicine')
    
    @action(detail=False, methods=['get'])
    def medicine_usage(self, request):
        """Get medicine usage statistics"""
        from apps.medicines.models import Medicine
        
        period = request.query_params.get('period', '30')  # Default to last 30 days
        
        try:
            days = int(period)
            start_date = timezone.now().date() - timedelta(days=days)
        except ValueError:
            start_date = timezone.now().date() - timedelta(days=30)
        
        # Get usage data for user's medicines
        medicines = Medicine.objects.filter(user=request.user)
        usage_data = []
        
        for medicine in medicines:
            stats = MedicineUsageStats.objects.filter(
                medicine=medicine,
                date__gte=start_date
            ).order_by('date')
            
            if stats.exists():
                avg_adherence = stats.aggregate(avg=Avg('adherence_rate'))['avg'] or 0
                total_doses = stats.aggregate(total=Sum('total_doses'))['total'] or 0
                taken_doses = stats.aggregate(total=Sum('taken_doses'))['total'] or 0
                
                usage_data.append({
                    'medicine_id': medicine.id,
                    'medicine_name': medicine.name,
                    'avg_adherence': avg_adherence,
                    'total_doses': total_doses,
                    'taken_doses': taken_doses,
                    'daily_stats': MedicineUsageStatsSerializer(stats, many=True).data
                })
        
        return Response(usage_data)


class ExportRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ExportRequestSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['export_type', 'status']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        return ExportRequest.objects.filter(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def download(self, request, pk=None):
        """Download export file"""
        export_request = self.get_object()
        
        if export_request.status != 'completed':
            return Response(
                {'error': 'Export not completed yet'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not export_request.file_path:
            return Response(
                {'error': 'Export file not available'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # In production, serve the file from cloud storage
        return Response({
            'download_url': f"/api/analytics/download/{export_request.id}/",
            'filename': export_request.file_path.split('/')[-1]
        })
    
    @action(detail=False, methods=['post'])
    def create_export(self, request):
        """Create a new export request"""
        export_type = request.data.get('export_type')
        parameters = request.data.get('parameters', {})
        
        if not export_type:
            return Response(
                {'error': 'export_type is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        export_request = ExportRequest.objects.create(
            user=request.user,
            export_type=export_type,
            parameters=parameters
        )
        
        # Process export asynchronously
        process_export_request.delay(export_request.id)
        
        return Response(
            ExportRequestSerializer(export_request).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=False, methods=['get'])
    def export_center(self, request):
        """Get export center data"""
        recent_exports = self.get_queryset()[:10]
        pending_count = self.get_queryset().filter(status__in=['pending', 'processing']).count()
        
        return Response({
            'recent_exports': ExportRequestSerializer(recent_exports, many=True).data,
            'pending_count': pending_count,
            'available_exports': [
                {'type': 'adherence_report', 'name': 'Adherence Report'},
                {'type': 'medicine_list', 'name': 'Medicine List'},
                {'type': 'dose_history', 'name': 'Dose History'},
                {'type': 'full_data', 'name': 'Full Data Export'},
            ]
        })


# ─────────────── PDF Report Download View ───────────────────

@api_view(['GET'])
@perm_classes([IsAuthenticated])
def download_pdf_report(request):
    """
    Generate and download a PDF report.

    Query params:
      - type: medicine_list | dose_history | adherence_report | full_report
      - days: number of days to include (default 30)
    """
    from .pdf_reports import generate_pdf_report

    report_type = request.query_params.get('type', 'full_report')
    days = request.query_params.get('days', '30')

    valid_types = ['medicine_list', 'dose_history', 'adherence_report', 'full_report']
    if report_type not in valid_types:
        return Response(
            {'error': f'Invalid report type. Choose from: {", ".join(valid_types)}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        days_int = int(days)
        if days_int < 1 or days_int > 365:
            days_int = 30
    except (ValueError, TypeError):
        days_int = 30

    try:
        pdf_buffer = generate_pdf_report(
            user=request.user,
            report_type=report_type,
            parameters={'days': days_int},
        )

        filename = f"saluslogica_{report_type}_{timezone.now().strftime('%Y%m%d')}.pdf"

        response = HttpResponse(pdf_buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    except Exception as e:
        return Response(
            {'error': f'Failed to generate report: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(['GET'])
@perm_classes([IsAuthenticated])
def report_types(request):
    """Return available PDF report types with descriptions."""
    return Response({
        'report_types': [
            {
                'type': 'medicine_list',
                'name': 'Medication List',
                'description': 'Complete list of all your medications with dosage, frequency, and status.',
                'icon': 'pills',
            },
            {
                'type': 'dose_history',
                'name': 'Dose History',
                'description': 'Detailed log of all scheduled doses and their status (taken, missed, snoozed).',
                'icon': 'history',
            },
            {
                'type': 'adherence_report',
                'name': 'Adherence Statistics',
                'description': 'Adherence rates per medicine with daily breakdown and visual progress bars.',
                'icon': 'chart-bar',
            },
            {
                'type': 'full_report',
                'name': 'Complete Health Report',
                'description': 'Comprehensive report combining medications, dose history, and adherence analysis.',
                'icon': 'file-medical',
            },
        ],
        'period_options': [
            {'value': 7, 'label': 'Last 7 days'},
            {'value': 14, 'label': 'Last 14 days'},
            {'value': 30, 'label': 'Last 30 days'},
            {'value': 60, 'label': 'Last 60 days'},
            {'value': 90, 'label': 'Last 90 days'},
            {'value': 180, 'label': 'Last 6 months'},
            {'value': 365, 'label': 'Last year'},
        ],
    })
