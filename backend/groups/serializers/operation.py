from rest_framework import serializers
from groups.models import OperationType, ValidationGroup


class OperationCreateSerializer(serializers.Serializer):
    operation_type = serializers.ChoiceField(choices=OperationType.choices)
    group_id = serializers.IntegerField()
    initiator_phone_number = serializers.CharField()
    payload = serializers.JSONField()

    def validate_group_id(self, value):
        if not ValidationGroup.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError("Groupe invalide ou inactif")
        return value
