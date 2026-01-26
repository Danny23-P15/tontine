from rest_framework import serializers


class OperationRespondSerializer(serializers.Serializer):
    validation_reference = serializers.CharField()
    validator_phone = serializers.CharField()
    accept = serializers.BooleanField()
    rejection_reason = serializers.CharField(
        required=False,
        allow_null=True,
        allow_blank=True
    )

    def validate(self, data):
        if not data["accept"] and not data.get("rejection_reason"):
            raise serializers.ValidationError(
                "rejection_reason est requis si accept = false"
            )
        return data
