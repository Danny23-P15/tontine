from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from groups.services import respond_to_operation_validation
from core.models import User

class UserMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "phone_number", "full_name"]

# ✅ JWT avec phone_number
class PhoneTokenObtainPairSerializer(TokenObtainPairSerializer):
    phone_number = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        # SimpleJWT attend "username"
        attrs["username"] = attrs.get("phone_number")
        return super().validate(attrs)

# ✅ Réponse à une validation d'opération
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
