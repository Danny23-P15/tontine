# api/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from groups.services import respond_to_operation_validation
from rest_framework_simplejwt.views import TokenObtainPairView
from api.serializers import PhoneTokenObtainPairSerializer
from api.serializers import RespondOperationSerializer
from rest_framework.permissions import IsAuthenticated
from api.serializers import UserMinimalSerializer
from core.models import User


class PhoneTokenObtainPairView(TokenObtainPairView):
    serializer_class = PhoneTokenObtainPairSerializer


class RespondToOperationValidationAPIView(APIView):
    
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RespondOperationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        success, message = respond_to_operation_validation(
            validation_reference=serializer.validated_data["validation_reference"],
            validator_phone=request.user.phone_number,
            accept=serializer.validated_data["accept"],
            rejection_reason=serializer.validated_data.get("rejection_reason"),
        )

        http_status = status.HTTP_200_OK if success else status.HTTP_400_BAD_REQUEST

        return Response(
            {
                "success": success,
                "message": message
            },
            status=http_status
        )
    
class MeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "id": request.user.id,
            "phone_number": request.user.phone_number,
            "full_name": request.user.full_name
        })
    
class UserListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        users = User.objects.exclude(id=request.user.id)
        serializer = UserMinimalSerializer(users, many=True)
        return Response(serializer.data)