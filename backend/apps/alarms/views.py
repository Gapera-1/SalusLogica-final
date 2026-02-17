from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import models
from apps.doses.models import DoseLog
from apps.alarms.models import MedicationSchedule, AlarmNotification


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
    def taken(self, request):
        """Alias for mark_group_taken for frontend compatibility"""
        return self.mark_group_taken(request)
    
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
    
    @action(detail=False, methods=['get'], url_path='reminders')
    def reminders(self, request):
        """
        Main reminders endpoint for the React app to poll.
        Returns active alarms and notifications in Kinyarwanda.
        """
        now = timezone.now()
        
        # Get active alarm notifications for the user
        notifications = AlarmNotification.objects.filter(
            user=request.user,
            notification_type='in_app',
            created_at__gte=now - timezone.timedelta(hours=1)  # Last hour
        ).select_related('medication_schedule', 'medication_schedule__medicine')
        
        # Get upcoming medication schedules
        upcoming_schedules = MedicationSchedule.objects.filter(
            user=request.user,
            is_active=True,
            alarm_sent=False,
            scheduled_time__lte=now + timezone.timedelta(minutes=30)
        ).select_related('medicine')
        
        # Get due/overdue schedules
        due_schedules = MedicationSchedule.objects.filter(
            user=request.user,
            is_active=True,
            scheduled_time__lte=now
        ).select_related('medicine')
        
        # Format notifications
        formatted_notifications = []
        for notification in notifications:
            formatted_notifications.append({
                'id': notification.id,
                'title': notification.title,  # Already in Kinyarwanda
                'message': notification.message,  # Already in Kinyarwanda
                'type': 'notification',
                'created_at': notification.created_at.isoformat(),
                'medicine_name': notification.medication_schedule.medicine.name if notification.medication_schedule else None,
                'scheduled_time': notification.medication_schedule.scheduled_time.isoformat() if notification.medication_schedule else None,
                'is_overdue': notification.medication_schedule.scheduled_time < now if notification.medication_schedule else False
            })
        
        # Format upcoming schedules
        formatted_upcoming = []
        for schedule in upcoming_schedules:
            minutes_until = int((schedule.scheduled_time - now).total_seconds() / 60)
            formatted_upcoming.append({
                'id': f"schedule_{schedule.id}",
                'title': "Igihe cyo gufata umuti kigeze",
                'message': f"{schedule.medicine.name} - {schedule.medicine.dosage or ''}".strip(),
                'type': 'upcoming',
                'minutes_until': minutes_until,
                'scheduled_time': schedule.scheduled_time.isoformat(),
                'medicine_name': schedule.medicine.name,
                'dosage': schedule.medicine.dosage
            })
        
        # Format due schedules
        formatted_due = []
        for schedule in due_schedules:
            is_overdue = schedule.scheduled_time < now
            formatted_due.append({
                'id': f"schedule_{schedule.id}",
                'title': "Igihe cyo gufata umuti kigeze",
                'message': f"{schedule.medicine.name} - {schedule.medicine.dosage or ''}".strip(),
                'type': 'due',
                'is_overdue': is_overdue,
                'scheduled_time': schedule.scheduled_time.isoformat(),
                'medicine_name': schedule.medicine.name,
                'dosage': schedule.medicine.dosage,
                'group_id': f"schedule_{schedule.id}"
            })
        
        # Combine all reminders
        all_reminders = formatted_notifications + formatted_upcoming + formatted_due
        
        # Sort by urgency (overdue first, then upcoming)
        all_reminders.sort(key=lambda x: (
            0 if x.get('is_overdue') else 1 if x.get('minutes_until', 999) < 5 else 2,
            x.get('scheduled_time', '')
        ))
        
        return Response({
            'reminders': all_reminders,
            'count': len(all_reminders),
            'has_active_alarms': len(formatted_due) > 0,
            'timestamp': now.isoformat()
        })
    
    @action(detail=False, methods=['post'], url_path='reminders/(?P<reminder_id>[^/.]+)/acknowledge')
    def acknowledge_reminder(self, request, reminder_id=None):
        """Acknowledge a reminder (mark as seen)"""
        try:
            # Try to find notification first
            notification = AlarmNotification.objects.get(
                id=reminder_id,
                user=request.user
            )
            notification.acknowledged_at = timezone.now()
            notification.save(update_fields=['acknowledged_at'])
            
            return Response({'status': 'acknowledged'})
            
        except AlarmNotification.DoesNotExist:
            # Try to find schedule and mark alarm as sent
            if reminder_id.startswith('schedule_'):
                schedule_id = reminder_id.split('_')[-1]
                try:
                    schedule = MedicationSchedule.objects.get(
                        id=schedule_id,
                        user=request.user
                    )
                    schedule.mark_alarm_sent()
                    return Response({'status': 'acknowledged'})
                except MedicationSchedule.DoesNotExist:
                    pass
            
            return Response(
                {'error': 'Reminder not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def diagnose(self, request):
        """Diagnostic endpoint - shows alarm system status"""
        from apps.medicines.models import Medicine
        import pytz
        
        now = timezone.now()
        
        try:
            user_profile = request.user.userprofile
            user_tz_str = user_profile.timezone or 'UTC'
            user_tz = pytz.timezone(user_tz_str)
        except:
            user_tz_str = 'UTC'
            user_tz = pytz.UTC
        
        # Get user's local time
        local_now = now.astimezone(user_tz)
        
        # Count medicines and schedules
        medicines_count = Medicine.objects.filter(user=request.user, is_active=True).count()
        schedules_count = MedicationSchedule.objects.filter(user=request.user).count()
        pending_schedules = MedicationSchedule.objects.filter(
            user=request.user,
            is_active=True,
            alarm_sent=False,
            scheduled_time__lte=now + timezone.timedelta(minutes=5)
        ).count()
        
        # Get next scheduled alarm
        next_schedule = MedicationSchedule.objects.filter(
            user=request.user,
            is_active=True,
            alarm_sent=False,
            scheduled_time__gt=now
        ).order_by('scheduled_time').first()
        
        # Get next local time medicine
        next_local = None
        if next_schedule:
            next_local = next_schedule.local_time.strftime('%Y-%m-%d %H:%M:%S') if next_schedule.local_time else "N/A"
        
        # Check for dose logs
        pending_doses = DoseLog.objects.filter(
            medicine__user=request.user,
            status='pending'
        ).count()
        
        return Response({
            'timestamp': now.isoformat(),
            'server_time': now.strftime('%Y-%m-%d %H:%M:%S UTC'),
            'user_timezone': user_tz_str,
            'user_local_time': local_now.strftime('%Y-%m-%d %H:%M:%S'),
            'medicines_count': medicines_count,
            'total_schedules': schedules_count,
            'pending_schedules_now': pending_schedules,
            'pending_dose_logs': pending_doses,
            'next_alarm': {
                'timestamp': next_schedule.scheduled_time.isoformat() if next_schedule else None,
                'utc_time': next_schedule.scheduled_time.strftime('%Y-%m-%d %H:%M:%S UTC') if next_schedule else None,
                'local_time': next_local,
                'medicine_name': next_schedule.medicine.name if next_schedule else None,
                'minutes_away': round((next_schedule.scheduled_time - now).total_seconds() / 60) if next_schedule else None,
            },
            'signal_handler_active': True,  # If this endpoint works, signals are working
            'frontend_should_poll': 'GET /api/alarms/active/ every 30 seconds',
        })
