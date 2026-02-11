from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import models
from apps.doses.models import DoseLog


class AlarmViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return DoseLog.objects.filter(
            medicine__user=self.request.user,
            status='pending'
        ).select_related('medicine')
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get active alarms (pending doses)"""
        now = timezone.now()
        active_doses = self.get_queryset().filter(
            scheduled_time__lte=now + timezone.timedelta(minutes=30)
        )
        
        # Group by alarm_group_id for multiple doses at same time
        alarm_groups = {}
        for dose in active_doses:
            group_id = dose.alarm_group_id or f"dose_{dose.id}"
            if group_id not in alarm_groups:
                alarm_groups[group_id] = {
                    'group_id': group_id,
                    'medicines': [],
                    'scheduled_time': dose.scheduled_time,
                    'is_overdue': dose.scheduled_time < now
                }
            
            alarm_groups[group_id]['medicines'].append({
                'id': dose.id,
                'name': dose.medicine.name,
                'dosage': dose.medicine.dosage,
                'medicine_id': dose.medicine.id
            })
        
        return Response(list(alarm_groups.values()))
    
    @action(detail=False, methods=['get'])
    def get_details(self, request):
        """Get alarm details for a specific group"""
        group_id = request.query_params.get('group_id')
        if not group_id:
            return Response(
                {'error': 'group_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        doses = self.get_queryset().filter(alarm_group_id=group_id)
        if not doses.exists():
            # Try to find single dose by ID
            try:
                dose_id = group_id.split('_')[-1]
                dose = DoseLog.objects.get(id=dose_id, medicine__user=request.user)
                return Response({
                    'group_id': group_id,
                    'medicines': [{
                        'id': dose.id,
                        'name': dose.medicine.name,
                        'dosage': dose.medicine.dosage,
                        'medicine_id': dose.medicine.id
                    }],
                    'scheduled_time': dose.scheduled_time,
                    'is_overdue': dose.scheduled_time < timezone.now()
                })
            except (DoseLog.DoesNotExist, IndexError, ValueError):
                return Response(
                    {'error': 'Alarm not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        return Response({
            'group_id': group_id,
            'medicines': [
                {
                    'id': dose.id,
                    'name': dose.medicine.name,
                    'dosage': dose.medicine.dosage,
                    'medicine_id': dose.medicine.id
                }
                for dose in doses
            ],
            'scheduled_time': doses.first().scheduled_time,
            'is_overdue': doses.first().scheduled_time < timezone.now()
        })
    
    @action(detail=True, methods=['get'])
    def details(self, request, pk=None):
        """Alias for get_details for frontend compatibility"""
        request.query_params = request.query_params.copy()
        request.query_params['group_id'] = pk
        return self.get_details(request)
        group_id = request.query_params.get('group_id')
        if not group_id:
            return Response(
                {'error': 'group_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        doses = self.get_queryset().filter(alarm_group_id=group_id)
        if not doses.exists():
            # Try to find single dose by ID
            try:
                dose = DoseLog.objects.get(id=group_id.split('_')[-1])
                return Response({
                    'group_id': group_id,
                    'medicines': [{
                        'id': dose.id,
                        'name': dose.medicine.name,
                        'dosage': dose.medicine.dosage,
                        'medicine_id': dose.medicine.id
                    }],
                    'scheduled_time': dose.scheduled_time,
                    'is_overdue': dose.scheduled_time < timezone.now()
                })
            except (DoseLog.DoesNotExist, IndexError, ValueError):
                return Response(
                    {'error': 'Alarm not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        return Response({
            'group_id': group_id,
            'medicines': [
                {
                    'id': dose.id,
                    'name': dose.medicine.name,
                    'dosage': dose.medicine.dosage,
                    'medicine_id': dose.medicine.id
                }
                for dose in doses
            ],
            'scheduled_time': doses.first().scheduled_time,
            'is_overdue': doses.first().scheduled_time < timezone.now()
        })
    
    @action(detail=False, methods=['post'])
    def mark_group_taken(self, request):
        """Mark all doses in an alarm group as taken"""
        group_id = request.data.get('group_id')
        if not group_id:
            return Response(
                {'error': 'group_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        doses = DoseLog.objects.filter(
            alarm_group_id=group_id,
            medicine__user=request.user
        )
        
        # If no group found, try single dose
        if not doses.exists():
            try:
                dose_id = group_id.split('_')[-1]
                dose = DoseLog.objects.get(id=dose_id, medicine__user=request.user)
                doses = DoseLog.objects.filter(id=dose.id)
            except (DoseLog.DoesNotExist, IndexError, ValueError):
                return Response(
                    {'error': 'Alarm not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        count = doses.count()
        doses.update(
            status='taken',
            taken_at=timezone.now()
        )
        
        return Response({
            'status': f'marked {count} doses as taken',
            'count': count
        })
    
    @action(detail=False, methods=['post'])
    def dismiss(self, request):
        """Dismiss alarm group"""
        group_id = request.data.get('group_id')
        if not group_id:
            return Response(
                {'error': 'group_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        doses = DoseLog.objects.filter(
            alarm_group_id=group_id,
            medicine__user=request.user
        )
        
        # If no group found, try single dose
        if not doses.exists():
            try:
                dose_id = group_id.split('_')[-1]
                dose = DoseLog.objects.get(id=dose_id, medicine__user=request.user)
                doses = DoseLog.objects.filter(id=dose.id)
            except (DoseLog.DoesNotExist, IndexError, ValueError):
                return Response(
                    {'error': 'Alarm not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        count = doses.count()
        doses.update(
            status='missed',
            dismissed_at=timezone.now()
        )
        
        return Response({
            'status': f'dismissed {count} doses',
            'count': count
        })
    
    @action(detail=False, methods=['post'])
    def snooze(self, request):
        """Snooze alarm group"""
        group_id = request.data.get('group_id')
        minutes = request.data.get('snooze_minutes', request.data.get('minutes', 15))
        
        if not group_id:
            return Response(
                {'error': 'group_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        doses = DoseLog.objects.filter(
            alarm_group_id=group_id,
            medicine__user=request.user
        )
        
        # If no group found, try single dose
        if not doses.exists():
            try:
                dose_id = group_id.split('_')[-1]
                dose = DoseLog.objects.get(id=dose_id, medicine__user=request.user)
                doses = DoseLog.objects.filter(id=dose.id)
            except (DoseLog.DoesNotExist, IndexError, ValueError):
                return Response(
                    {'error': 'Alarm not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        snooze_until = timezone.now() + timezone.timedelta(minutes=minutes)
        count = doses.count()
        doses.update(
            status='snoozed',
            snoozed_until=snooze_until,
            snooze_count=models.F('snooze_count') + 1
        )
        
        return Response({
            'status': f'snoozed {count} doses for {minutes} minutes',
            'count': count,
            'snoozed_until': snooze_until
        })
    
    @action(detail=False, methods=['get'])
    def check_reminders(self, request):
        """Check for reminders (real-time check)"""
        now = timezone.now()
        upcoming_doses = self.get_queryset().filter(
            scheduled_time__lte=now + timezone.timedelta(minutes=15),
            scheduled_time__gt=now
        )
        
        return Response({
            'upcoming_doses': [
                {
                    'id': dose.id,
                    'medicine_name': dose.medicine.name,
                    'dosage': dose.medicine.dosage,
                    'scheduled_time': dose.scheduled_time,
                    'minutes_until': int((dose.scheduled_time - now).total_seconds() / 60)
                }
                for dose in upcoming_doses
            ],
            'count': upcoming_doses.count()
        })
