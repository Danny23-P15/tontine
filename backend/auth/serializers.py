from rest_framework import serializers
from core.models import User
from rest_framework_simplejwt.tokens import RefreshToken

class LoginSerializer(serializers.Serializer):
    phone_number = serializers.CharField()

    def validate(self, data):
        try:
            user = User.objects.get(phone_number=data["phone_number"])
        except User.DoesNotExist:
            raise serializers.ValidationError("Utilisateur introuvable")

        refresh = RefreshToken.for_user(user)

        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": user.id,
                "phone_number": user.phone_number,
                "full_name": user.full_name,
                "email": user.email,
                "role": user.role,
                "is_superadmin": user.is_superadmin,
            }
        }
