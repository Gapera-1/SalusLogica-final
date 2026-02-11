from rest_framework import serializers
from .models import DrugInteraction, InteractionCheck, Contraindication, DrugDatabase


class DrugInteractionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DrugInteraction
        fields = '__all__'


class InteractionCheckSerializer(serializers.ModelSerializer):
    class Meta:
        model = InteractionCheck
        fields = '__all__'
        read_only_fields = ('user', 'check_date')


class ContraindicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contraindication
        fields = '__all__'


class DrugDatabaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = DrugDatabase
        fields = '__all__'
