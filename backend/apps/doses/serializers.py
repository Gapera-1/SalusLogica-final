from rest_framework import serializers
from .models import DoseLog, DoseReminder, DoseHistory


class DoseLogSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='medicine.name', read_only=True)
    medicine_dosage = serializers.CharField(source='medicine.dosage', read_only=True)
    is_overdue = serializers.ReadOnlyField()
    
    class Meta:
        model = DoseLog
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class DoseReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoseReminder
        fields = '__all__'
        read_only_fields = ('created_at',)


class DoseHistorySerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='medicine.name', read_only=True)
    
    class Meta:
        model = DoseHistory
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')
