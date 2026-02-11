from rest_framework import serializers
from .models import DashboardStats, AdherenceReport, MedicineUsageStats, ExportRequest


class DashboardStatsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DashboardStats
        fields = '__all__'
        read_only_fields = ('user', 'last_updated')


class AdherenceReportSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='medicine.name', read_only=True)
    
    class Meta:
        model = AdherenceReport
        fields = '__all__'
        read_only_fields = ('created_at',)


class MedicineUsageStatsSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='medicine.name', read_only=True)
    
    class Meta:
        model = MedicineUsageStats
        fields = '__all__'
        read_only_fields = ('created_at',)


class ExportRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExportRequest
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'completed_at', 'file_path')
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
