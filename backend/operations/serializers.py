from rest_framework import serializers
from groups.models import Operation, ValidationStatus
from groups.services import respond_to_operation_validation

class PendingOperationSerializer(serializers.ModelSerializer):
    group = serializers.SerializerMethodField()
    approved_count = serializers.SerializerMethodField()
    rejected_count = serializers.SerializerMethodField()
    my_validation_status = serializers.SerializerMethodField()
    transaction_details = serializers.SerializerMethodField()

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
            "transaction_details",
        ]

    def get_group(self, obj):
        return {
            "id": obj.group.id,
            "name": obj.group.group_name
        }

    def get_approved_count(self, obj):
        return obj.validations.filter(
            status=ValidationStatus.ACCEPTED
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

    def get_transaction_details(self, obj):
        if obj.operation_type == "TRANSACTION" and hasattr(obj, 'transaction'):
            return {
                "recipient_phone_number": obj.transaction.recipient_phone_number,
                "amount": str(obj.transaction.amount)
            }
        return None


class RespondOperationSerializer(serializers.Serializer):
    validation_reference = serializers.CharField()
    accept = serializers.BooleanField()
    rejection_reason = serializers.CharField(
        required=False,
        allow_null=True,
        allow_blank=True
    )

    def validate(self, data):
        if data["accept"] is False and not data.get("rejection_reason"):
            raise serializers.ValidationError({
                "rejection_reason": "Un motif de refus est obligatoire."
            })
        return data

    def save(self):
        user = self.context["user"]

        return respond_to_operation_validation(
            validation_reference=self.validated_data["validation_reference"],
            validator_phone=user.phone_number,
            accept=self.validated_data["accept"],
            rejection_reason=self.validated_data.get("rejection_reason"),
        )
