from django.contrib import admin
from .models import Notification, NotificationSettings, NotificationTemplate


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'notification_type', 'status', 'is_read', 'created_at')
    list_filter = ('notification_type', 'status', 'is_read', 'created_at')
    search_fields = ('user__username', 'title', 'message')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(NotificationSettings)
class NotificationSettingsAdmin(admin.ModelAdmin):
    list_display = ('user', 'email_notifications', 'push_notifications', 'dose_reminders')
    list_filter = ('email_notifications', 'push_notifications', 'sms_notifications')
    search_fields = ('user__username',)


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'notification_type', 'is_active', 'created_at')
    list_filter = ('notification_type', 'is_active')
    search_fields = ('name', 'title_template')
    readonly_fields = ('created_at', 'updated_at')
