from django.contrib import admin
from .models import Medicine, MedicineInteraction, UserAllergy


@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'dosage', 'frequency', 'is_active', 'completed', 'created_at')
    list_filter = ('frequency', 'is_active', 'completed', 'created_at')
    search_fields = ('name', 'user__username', 'prescribed_for')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(MedicineInteraction)
class MedicineInteractionAdmin(admin.ModelAdmin):
    list_display = ('medicine1', 'medicine2', 'severity', 'created_at')
    list_filter = ('severity', 'created_at')


@admin.register(UserAllergy)
class UserAllergyAdmin(admin.ModelAdmin):
    list_display = ('user', 'allergen', 'severity', 'created_at')
    list_filter = ('severity', 'created_at')
    search_fields = ('user__username', 'allergen')
