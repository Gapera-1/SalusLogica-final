from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from .models import Notification, NotificationSettings, NotificationTemplate
from .serializers import NotificationSerializer, NotificationSettingsSerializer, NotificationTemplateSerializer
from .tasks import send_notification, mark_notifications_as_read


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['notification_type', 'status', 'is_read']
    search_fields = ['title', 'message']
    ordering_fields = ['created_at', 'sent_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a specific notification as read"""
        notification = self.get_object()
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.status = 'read'
        notification.save()
        
        return Response({'status': 'notification marked as read'})
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read for the user"""
        task = mark_notifications_as_read.delay(request.user.id)
        return Response({'status': 'marking all notifications as read', 'task_id': task.id})
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications"""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})
    
    @action(detail=False, methods=['get'])
    def center(self, request):
        """Get notification center data with unread notifications and settings"""
        unread_notifications = self.get_queryset().filter(is_read=False)[:10]
        unread_count = self.get_queryset().filter(is_read=False).count()
        
        # Get or create notification settings
        settings, created = NotificationSettings.objects.get_or_create(
            user=request.user
        )
        
        return Response({
            'unread_notifications': NotificationSerializer(unread_notifications, many=True).data,
            'unread_count': unread_count,
            'settings': NotificationSettingsSerializer(settings).data
        })


class NotificationSettingsViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSettingsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return NotificationSettings.objects.filter(user=self.request.user)
    
    def get_object(self):
        settings, created = NotificationSettings.objects.get_or_create(
            user=self.request.user
        )
        return settings


class NotificationTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationTemplateSerializer
    permission_classes = [IsAuthenticated]
    queryset = NotificationTemplate.objects.all()
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'title_template']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
