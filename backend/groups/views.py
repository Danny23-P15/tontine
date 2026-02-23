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
from groups.serializers import RespondAddValidatorSerializer, RemoveValidatorSerializer
from groups.services.operation_service import request_remove_validator
from groups.models import Operation
from groups.models import TemporaryGroupCreation
from django.utils import timezone
from groups.services.operation_validation import respond_to_remove_validator_request
from groups.models import OperationType
from groups.services.operation_validation import respond_to_delete_group_request
from groups.services.operation_service import request_delete_group
from groups.models import OperationStatus, ValidationStatus
from groups.services.operation_service import cancel_operation


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

class RemoveValidatorAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, group_id):

        serializer = RemoveValidatorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            group = ValidationGroup.objects.get(id=group_id)
        except ValidationGroup.DoesNotExist:
            return Response(
                {"detail": "Groupe introuvable"},
                status=status.HTTP_404_NOT_FOUND
            )

        validator_phone = serializer.validated_data["validator_phone_number"]

        success, message = request_remove_validator(
            group=group,
            initiator_phone=request.user.phone_number,
            validator_phone=validator_phone,
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

class RespondOperationAPIView(APIView):
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

        operation_type = operation.operation_type

        if operation_type == OperationType.ADD_VALIDATOR:
            success, message = respond_to_add_validator_request(
                operation=operation,
                validator_phone=request.user.phone_number,
                accept=serializer.validated_data["accept"],
                rejection_reason=serializer.validated_data.get("rejection_reason")
            )

        elif operation_type == OperationType.REMOVE_VALIDATOR:
            success, message = respond_to_remove_validator_request(
                operation=operation,
                validator_phone=request.user.phone_number,
                accept=serializer.validated_data["accept"],
                rejection_reason=serializer.validated_data.get("rejection_reason")
            )

        elif operation_type == OperationType.DELETE_GROUP:
            success, message = respond_to_delete_group_request(
                operation=operation,
                validator_phone=request.user.phone_number,
                accept=serializer.validated_data["accept"],
                rejection_reason=serializer.validated_data.get("rejection_reason")
            )


        else:
            return Response(
                {"message": "Opération invalide"},
                status=400
            )

        status_code = 200 if success else 400
        return Response({"message": message}, status=status_code)

class RequestDeleteGroupAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        group_id = request.data.get("group_id")

        if not group_id:
            return Response(
                {"message": "group_id requis"},
                status=400
            )

        try:
            group = ValidationGroup.objects.get(
                id=group_id,
                is_active=True
            )
        except ValidationGroup.DoesNotExist:
            return Response(
                {"message": "Groupe introuvable ou inactif"},
                status=404
            )

        success, message = request_delete_group(
            group=group,
            initiator_phone=request.user.phone_number
        )

        return Response(
            {"message": message},
            status=200 if success else 400
        )

class MyInitiatedOperationsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        phone = request.user.phone_number

        operations = Operation.objects.filter(
            initiator_phone_number=phone
        ).select_related("group").order_by("-created_at")

        data = []

        for op in operations:
            validations = op.validations.all()

            total = validations.count()
            approved = validations.filter(
                status=ValidationStatus.ACCEPTED
            ).count()

            data.append({
                "reference": op.reference,
                "group_name": op.group.group_name,
                "operation_type": op.operation_type,
                "status": op.status,
                "created_at": op.created_at,
                "expires_at": op.expires_at,
                "approved_count": approved,
                "total_validators": total,
            })

        # Inclure aussi les demandes de création de groupe temporaires initiées
        temp_groups = TemporaryGroupCreation.objects.filter(
            initiator_phone_number=phone
        ).order_by("-created_at")

        now = timezone.now()

        for tg in temp_groups:
            accepted_count = tg.validators.filter(has_accepted=True).count()
            total_validators = tg.validators.count()

            # Déterminer un statut simple pour l'affichage
            if tg.is_cancelled:
                tg_status = "CANCELLED"
            elif tg.expires_at and tg.expires_at < now:
                tg_status = "EXPIRED"
            elif accepted_count >= tg.quorum:
                tg_status = "APPROVED"
            else:
                tg_status = "PENDING"

            data.append({
                "reference": f"temp-group-{tg.id}",
                "group_name": tg.group_name,
                "operation_type": "GROUP_CREATION",
                "status": tg_status,
                "created_at": tg.created_at,
                "expires_at": tg.expires_at,
                "approved_count": accepted_count,
                "total_validators": total_validators,
            })

        return Response(data)
    
class CancelOperationAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        reference = request.data.get("reference")

        try:
            operation = Operation.objects.get(reference=reference)
        except Operation.DoesNotExist:
            return Response(
                {"detail": "Opération introuvable"},
                status=404
            )

        success, message = cancel_operation(
            operation,
            request.user.phone_number
        )

        if not success:
            return Response({"detail": message}, status=400)

        return Response({"detail": message})