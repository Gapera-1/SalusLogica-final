from django.contrib import admin
from .models import DashboardStats, AdherenceReport, MedicineUsageStats, ExportRequest


@admin.register(DashboardStats)
class DashboardStatsAdmin(admin.ModelAdmin):
    list_display = ('user', 'total_medicines', 'active_medicines', 'adherence_rate', 'streak_days', 'last_updated')
    list_filter = ('last_updated',)
    search_fields = ('user__username',)
    readonly_fields = ('last_updated',)


@admin.register(AdherenceReport)
class AdherenceReportAdmin(admin.ModelAdmin):
    list_display = ('user', 'medicine', 'period', 'start_date', 'end_date', 'adherence_percentage')
    list_filter = ('period', 'start_date', 'adherence_percentage')
    search_fields = ('user__username', 'medicine__name')
    readonly_fields = ('created_at',)


@admin.register(MedicineUsageStats)
class MedicineUsageStatsAdmin(admin.ModelAdmin):
    list_display = ('medicine', 'date', 'total_doses', 'taken_doses', 'adherence_rate')
    list_filter = ('date', 'adherence_rate')
    search_fields = ('medicine__name',)
    readonly_fields = ('created_at',)


@admin.register(ExportRequest)
class ExportRequestAdmin(admin.ModelAdmin):
    list_display = ('user', 'export_type', 'status', 'created_at', 'completed_at')
    list_filter = ('export_type', 'status', 'created_at')
    search_fields = ('user__username',)
    readonly_fields = ('created_at', 'completed_at')
