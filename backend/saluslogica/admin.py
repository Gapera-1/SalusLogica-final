"""
Pharmacy Admin Admin Configuration
"""

from django.contrib import admin
from .models import PharmacyAdmin, PatientPharmacyAssociation, AdverseReaction


@admin.register(PharmacyAdmin)
class PharmacyAdminAdmin(admin.ModelAdmin):
    """Admin configuration for PharmacyAdmin model"""
    
    list_display = [
        'pharmacy_id', 'user', 'facility_name', 'facility_type', 
        'country', 'province', 'district', 'is_active', 'is_verified', 'created_at'
    ]
    list_filter = ['facility_type', 'is_active', 'is_verified', 'country', 'province']
    search_fields = ['pharmacy_id', 'facility_name', 'user__username', 'user__email']
    readonly_fields = ['pharmacy_id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'pharmacy_id', 'facility_name', 'facility_type')
        }),
        ('Location', {
            'fields': ('country', 'province', 'district')
        }),
        ('Contact Information', {
            'fields': ('phone_number', 'email', 'address')
        }),
        ('License Information', {
            'fields': ('license_number', 'license_expiry')
        }),
        ('Status', {
            'fields': ('is_active', 'is_verified')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        })
    )


@admin.register(PatientPharmacyAssociation)
class PatientPharmacyAssociationAdmin(admin.ModelAdmin):
    """Admin configuration for PatientPharmacyAssociation model"""
    
    list_display = ['patient', 'pharmacy_admin', 'assigned_date', 'is_active', 'consent_given']
    list_filter = ['is_active', 'consent_given', 'assigned_date']
    search_fields = ['patient__username', 'patient__email', 'pharmacy_admin__pharmacy_id', 'pharmacy_admin__facility_name']
    
    fieldsets = (
        ('Association', {
            'fields': ('patient', 'pharmacy_admin', 'assigned_date')
        }),
        ('Status', {
            'fields': ('is_active', 'consent_given', 'consent_date')
        }),
        ('Notes', {
            'fields': ('notes',)
        })
    )


@admin.register(AdverseReaction)
class AdverseReactionAdmin(admin.ModelAdmin):
    """Admin configuration for AdverseReaction model"""
    
    list_display = [
        'patient', 'pharmacy_admin', 'medication_name', 'reaction_type', 
        'severity', 'reported_date', 'is_resolved'
    ]
    list_filter = [
        'reaction_type', 'severity', 'outcome', 'reported_by', 'is_resolved', 'reported_date'
    ]
    search_fields = [
        'patient__username', 'medication_name', 'symptoms', 'pharmacy_admin__pharmacy_id'
    ]
    readonly_fields = ['reported_date']
    
    fieldsets = (
        ('Patient Information', {
            'fields': ('patient', 'pharmacy_admin')
        }),
        ('Reaction Details', {
            'fields': (
                'reaction_type', 'severity', 'medication_name', 
                'medication_dosage', 'medication_batch'
            )
        }),
        ('Symptoms & Timing', {
            'fields': ('symptoms', 'onset_time', 'duration')
        }),
        ('Treatment & Outcome', {
            'fields': ('treatment_given', 'outcome', 'is_resolved', 'resolved_date')
        }),
        ('Reporting', {
            'fields': ('reported_date', 'reported_by')
        }),
        ('Follow-up', {
            'fields': ('requires_follow_up', 'follow_up_date', 'follow_up_notes')
        })
    )
