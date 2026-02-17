from django.contrib import admin
from .models import Medicine, MedicineInteraction, UserAllergy, Drug, Contraindication, PatientProfile


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


@admin.register(Drug)
class DrugAdmin(admin.ModelAdmin):
    list_display = ('name', 'generic_name', 'atc_code', 'is_registered_in_rwanda', 'is_essential_in_rwanda')
    list_filter = ('is_registered_in_rwanda', 'is_essential_in_rwanda')
    search_fields = ('name', 'generic_name', 'atc_code')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Contraindication)
class ContraindicationAdmin(admin.ModelAdmin):
    list_display = ('drug', 'population', 'condition', 'severity', 'source')
    list_filter = ('population', 'severity')
    search_fields = ('drug__name', 'drug__generic_name', 'condition', 'description')
    readonly_fields = ('last_updated',)
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "drug":
            kwargs["queryset"] = Drug.objects.order_by('name')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(PatientProfile)
class PatientProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'age', 'is_pregnant', 'is_lactating', 'get_population_category', 'updated_at')
    list_filter = ('is_pregnant', 'is_lactating')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('created_at', 'updated_at', 'get_population_category')
    
    def get_population_category(self, obj):
        from .models import get_population_category
        return get_population_category(obj)
    get_population_category.short_description = 'Population Category'
