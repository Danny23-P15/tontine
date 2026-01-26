from rest_framework import serializers
from groups.models import Operation, ValidationStatus

class PendingOperationSerializer(serializers.ModelSerializer):
    group = serializers.SerializerMethodField()
    approved_count = serializers.SerializerMethodField()
    rejected_count = serializers.SerializerMethodField()
    my_validation_status = serializers.SerializerMethodField()

    class Meta:
        model = Operation
        fields = [
            "operation_reference",
            "operation_type",
            "expires_at",
            "group",
            "initiator_phone_number",
            "quorum",
            "approved_count",
            "rejected_count",
            "my_validation_status",
        ]

    def get_group(self, obj):
        return {
            "id": obj.group.id,
            "name": obj.group.group_name
        }

    def get_approved_count(self, obj):
        return obj.validations.filter(
            status=ValidationStatus.APPROVED
        ).count()

    def get_rejected_count(self, obj):
        return obj.validations.filter(
            status=ValidationStatus.REJECTED
        ).count()

    def get_my_validation_status(self, obj):
        phone = self.context["validator_phone"]
        validation = obj.validations.filter(
            validator_phone_number=phone
        ).first()

        return validation.status if validation else None


        