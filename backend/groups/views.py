from urllib import request
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from groups.serializers import CreateGroupRequestSerializer
from groups.services.group_creation import create_group_request
from groups.services.group_validation import respond_to_group_creation
from groups.serializers import RespondGroupCreationSerializer
from groups.services.my_groups import get_my_groups
from groups.services.group_detail import get_group_detail
from groups.services.operation_service import request_add_validator
from groups.models import ValidationGroup
from groups.serializers import AddValidatorSerializer
from django.contrib.auth import get_user_model
from core.models import User
from groups.services.operation_validation import respond_to_add_validator_request
from groups.serializers import RespondAddValidatorSerializer
from groups.models import Operation



class CreateGroupRequestAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateGroupRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        success, reason, temp_group = create_group_request(
            initiator_phone=request.user.phone_number,
            group_name=serializer.validated_data["group_name"],
            quorum=serializer.validated_data["quorum"],
            validators=serializer.validated_data["validators"],
        )

        if not success:
            return Response(
                {
                    "success": False,
                    "message": reason
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {
                "success": True,
                "temp_group_id": temp_group.id

            },
            status=status.HTTP_201_CREATED
        )

class RespondGroupCreationAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RespondGroupCreationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        success, message = respond_to_group_creation(
            validator_phone=request.user.phone_number,
            temp_group_id=serializer.validated_data["temp_group_id"],
            accept=serializer.validated_data["accept"],
            rejection_reason=serializer.validated_data.get("rejection_reason")
        )

        status_code = 200 if success else 400
        return Response({"message": message}, status=status_code)

class MyGroupsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = get_my_groups(request.user)
        return Response(data, status=status.HTTP_200_OK)
    
class GroupDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id):
        data = get_group_detail(request.user, group_id)
        return Response(data, status=status.HTTP_200_OK)
    
class AddValidatorAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, group_id):
        print("DEBUG DATA:", request.data)

        serializer = AddValidatorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            group = ValidationGroup.objects.get(id=group_id)
        except ValidationGroup.DoesNotExist:
            return Response(
                {"detail": "Groupe introuvable"},
                status=status.HTTP_404_NOT_FOUND
            )

        validator_phone = serializer.validated_data["validator_phone_number"]

        # 👤 Récupération du user à ajouter
        try:
            validator_user = User.objects.get(phone_number=validator_phone)
        except User.DoesNotExist:
            return Response(
                {"detail": "Utilisateur introuvable"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 🔐 CIN récupéré côté backend
        validator_cin = validator_user.cin

        # ⚙️ Appel règle métier
        success, message = request_add_validator(
            group=group,
            initiator_phone=request.user.phone_number,
            validator_phone=validator_phone,
            validator_cin=validator_cin
        )

        if not success:
            return Response(
                {"detail": message},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {"detail": message},
            status=status.HTTP_200_OK
        )
    print("SERIALIZER CLASS:", AddValidatorSerializer)

class RespondAddValidatorAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RespondAddValidatorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            operation = Operation.objects.get(
                id=serializer.validated_data["operation_id"]
            )
        except Operation.DoesNotExist:
            return Response(
                {"message": "Opération introuvable"},
                status=404
            )

        success, message = respond_to_add_validator_request(
            operation=operation,
            validator_phone=request.user.phone_number,
            accept=serializer.validated_data["accept"],
            rejection_reason=serializer.validated_data.get("rejection_reason")
        )

        status_code = 200 if success else 400
        return Response({"message": message}, status=status_code)
