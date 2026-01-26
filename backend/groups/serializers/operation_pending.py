# groups/serializers/operation_pending.py
from rest_framework import serializers


class PendingOperationSerializer(serializers.Serializer):
    validation_reference = serializers.CharField()
    operation_reference = serializers.CharField(source="operation.reference")
    operation_type = serializers.CharField(source="operation.operation_type")
    initiator_phone = serializers.CharField(
        source="operation.initiator_phone_number"
    )
    payload = serializers.JSONField(source="operation.payload")
    expires_at = serializers.DateTimeField(source="operation.expires_at")

    group = serializers.SerializerMethodField()

    def get_group(self, obj):
        group = obj.operation.group
        return {
            "id": group.id,
            "name": group.group_name
        }
