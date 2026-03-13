from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

from groups.models import (
    TemporaryGroupCreation,
    TemporaryGroupValidator,
    Operation,
    OperationValidation,
    GroupMembership,
    GroupRole,
    OperationStatus,
    ValidationGroup,
    ValidationStatus
)
from groups.serializers.group_creation import GroupCreationSerializer
from notifications.services.notification_service import notify
from groups.serializers.operation import OperationCreateSerializer
from groups.serializers.operation_pending import PendingOperationSerializer
from groups.serializers.operation_respond import (
    OperationRespondSerializer
)
from groups.services.operation_validation import (
    respond_to_operation_validation
)


class GroupCreateAPIView(APIView):

    def post(self, request):
        serializer = GroupCreationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        temp_group = TemporaryGroupCreation.objects.create(
            group_name=data["group_name"],
            initiator_phone_number=data["initiator_phone_number"],
            quorum=data["quorum"],
            expires_at=timezone.now() + timezone.timedelta(days=2)
        )

        for v in data["validators"]:
            TemporaryGroupValidator.objects.create(
                temp_group=temp_group,
                phone_number=v["phone_number"],
                cin=v["cin"]
            )

            # 🔔 notifier chaque validateur
            notify(
                recipient_phone=v["phone_number"],
                title="Demande de création de groupe",
                message=(
                    f"Vous avez été désigné validateur pour la création "
                    f"du groupe « {temp_group.group_name} »."
                )
            )

        return Response(
            {
                "message": "Demande de création du groupe envoyée aux validateurs",
                "temp_group_id": temp_group.id
            },
            status=status.HTTP_201_CREATED
        )

class OperationCreateAPIView(APIView):

    def post(self, request):
        serializer = OperationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        group = ValidationGroup.objects.get(id=data["group_id"])

        # validateurs actifs du groupe
        validators = GroupMembership.objects.filter(
            group=group,
            role=GroupRole.VALIDATOR,
            is_active=True
        )

        operation = Operation.objects.create(
            operation_type=data["operation_type"],
            group=group,
            initiator_phone_number=data["initiator_phone_number"],
            payload=data["payload"],
            status=OperationStatus.PENDING,
            expires_at=timezone.now() + timezone.timedelta(days=2)
        )

        for v in validators:
            OperationValidation.objects.create(
                operation=operation,
                validator_phone_number=v.phone_number
            )

            # 🔔 notifier chaque validateur
            notify(
                recipient_phone=v.phone_number,
                title="Nouvelle opération à valider",
                message=(
                    f"Une opération {operation.operation_type} "
                    f"est en attente de votre validation "
                    f"pour le groupe « {group.group_name} »."
                ),
                operation=operation
            )

        return Response(
            {
                "message": "Opération créée et envoyée aux validateurs",
                "operation_reference": operation.reference
            },
            status=status.HTTP_201_CREATED
        )
    
class PendingOperationsAPIView(APIView):

    def get(self, request):
        phone = request.query_params.get("phone")

        if not phone:
            return Response(
                {"detail": "phone est requis"},
                status=status.HTTP_400_BAD_REQUEST
            )

        validations = OperationValidation.objects.select_related(
            "operation", "operation__group"
        ).filter(
            validator_phone_number=phone,
            status=ValidationStatus.PENDING,
            operation__status=OperationStatus.PENDING
        )

        # Check for expired operations
        valid_validations = []
        for validation in validations:
            operation = validation.operation
            operation.check_and_expire()  # Update status if expired
            if operation.status == OperationStatus.PENDING:
                valid_validations.append(validation)

        serializer = PendingOperationSerializer(valid_validations, many=True)

        return Response(serializer.data, status=status.HTTP_200_OK)
    
class RespondToOperationAPIView(APIView):

    def post(self, request):
        serializer = OperationRespondSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        data = serializer.validated_data

        success, message = respond_to_operation_validation(
            validation_reference=data["validation_reference"],
            validator_phone=data["validator_phone"],
            accept=data["accept"],
            rejection_reason=data.get("rejection_reason")
        )

        status_code = (
            status.HTTP_200_OK if success
            else status.HTTP_400_BAD_REQUEST
        )

        return Response(
            {
                "success": success,
                "message": message
            },
            status=status_code
        )