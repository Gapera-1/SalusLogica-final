from django.contrib import admin
from .models import DrugInteraction, InteractionCheck, Contraindication, DrugDatabase


@admin.register(DrugInteraction)
class DrugInteractionAdmin(admin.ModelAdmin):
    list_display = ('medicine1', 'medicine2', 'interaction_type', 'severity', 'is_verified')
    list_filter = ('interaction_type', 'severity', 'is_verified')
    search_fields = ('medicine1', 'medicine2', 'description')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(InteractionCheck)
class InteractionCheckAdmin(admin.ModelAdmin):
    list_display = ('user', 'check_date', 'medicines')
    list_filter = ('check_date',)
    search_fields = ('user__username',)
    readonly_fields = ('check_date',)


@admin.register(Contraindication)
class ContraindicationAdmin(admin.ModelAdmin):
    list_display = ('medicine', 'condition', 'severity', 'is_verified')
    list_filter = ('severity', 'is_verified')
    search_fields = ('medicine', 'condition', 'description')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(DrugDatabase)
class DrugDatabaseAdmin(admin.ModelAdmin):
    list_display = ('generic_name', 'brand_names', 'drug_class', 'atc_code', 'is_active')
    list_filter = ('drug_class', 'is_active')
    search_fields = ('generic_name', 'brand_names', 'drug_class')
    readonly_fields = ('created_at', 'last_updated')
