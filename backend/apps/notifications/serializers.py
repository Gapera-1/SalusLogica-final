from rest_framework import serializers
from .models import Notification, NotificationSettings, NotificationTemplate, FCMDevice


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at')


class NotificationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationSettings
        fields = '__all__'
        read_only_fields = ('user',)
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class NotificationTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationTemplate
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class FCMDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = FCMDevice
        fields = ['id', 'registration_token', 'device_type', 'device_name',
                  'is_active', 'created_at', 'updated_at']
        read_only_fields = ('id', 'is_active', 'created_at', 'updated_at')


class FCMDeviceRegisterSerializer(serializers.Serializer):
    """Validates incoming device registration requests."""
    registration_token = serializers.CharField(max_length=4096)
    device_type = serializers.ChoiceField(
        choices=['web', 'android', 'ios'], default='web'
    )
    device_name = serializers.CharField(max_length=255, required=False, default='')
