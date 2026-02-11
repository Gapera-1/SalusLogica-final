from django.contrib import admin
from .models import DoseLog, DoseReminder, DoseHistory


@admin.register(DoseLog)
class DoseLogAdmin(admin.ModelAdmin):
    list_display = ('medicine', 'scheduled_time', 'status', 'taken_at', 'snooze_count')
    list_filter = ('status', 'scheduled_time', 'created_at')
    search_fields = ('medicine__name', 'medicine__user__username')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(DoseReminder)
class DoseReminderAdmin(admin.ModelAdmin):
    list_display = ('dose_log', 'reminder_type', 'sent_at', 'is_successful')
    list_filter = ('reminder_type', 'is_successful', 'sent_at')


@admin.register(DoseHistory)
class DoseHistoryAdmin(admin.ModelAdmin):
    list_display = ('user', 'medicine', 'date', 'adherence_percentage', 'doses_taken', 'doses_scheduled')
    list_filter = ('date', 'adherence_percentage')
    search_fields = ('user__username', 'medicine__name')
    readonly_fields = ('created_at', 'updated_at')
