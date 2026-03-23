from urllib import request
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone

from core.models import User
from groups.models import (
    Operation, OperationStatus, OperationType, Transaction,
    ValidationGroup, ValidationStatus, TemporaryGroupCreation, Account, GroupMembership
)
from groups.serializers import (
    AddValidatorSerializer, CreateGroupRequestSerializer,
    RemoveValidatorSerializer, RespondAddValidatorSerializer,
    RespondGroupCreationSerializer,
)

from groups.services import (
    group_creation as gc,
    group_validation as gv,
    my_groups as mg,
    initiator_groups as ig,
    group_detail as gd,
    operation_service as os,
    operation_validation as ov,
)

create_group_request = gc.create_group_request
respond_to_group_creation = gv.respond_to_group_creation
get_my_groups = mg.get_my_groups
get_initiator_groups = ig.get_initiator_groups
get_group_detail = gd.get_group_detail

request_add_validator = os.request_add_validator
request_transaction = os.request_transaction
request_remove_validator = os.request_remove_validator
request_delete_group = os.request_delete_group
cancel_operation = os.cancel_operation
create_operation = os.create_operation

respond_to_add_validator_request = ov.respond_to_add_validator_request
respond_to_remove_validator_request = ov.respond_to_remove_validator_request
respond_to_delete_group_request = ov.respond_to_delete_group_request
respond_to_transaction_request = ov.respond_to_transaction_request

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

class MyInitiatorGroupsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = get_initiator_groups(request.user)
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

        elif operation_type == OperationType.TRANSACTION:
            # Ici on pourrait avoir un serializer spécifique pour les transactions
            success, message = respond_to_transaction_request(
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
            # Check if operation has expired
            op.check_and_expire()
            
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
    
class RequestTransactionAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, group_id):
        amount = Decimal(request.data.get("amount"))
        recipient = request.data.get("phone_number")

        group = get_object_or_404(
            ValidationGroup,
            id=group_id,
            is_active=True
        )

        success, message = request_transaction(
            group=group,
            initiator_phone=request.user.phone_number,
            recipient_phone=recipient,
            amount=amount
        )

        if not success:
            return Response({"detail": message}, status=400)

        # Get the created operation
        operation = Operation.objects.filter(
            group=group,
            initiator_phone_number=request.user.phone_number,
            operation_type=OperationType.TRANSACTION,
            status=OperationStatus.PENDING
        ).latest('created_at')

        return Response({
            "reference": operation.reference
        })

class GroupBalanceAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id):
        group = get_object_or_404(ValidationGroup, id=group_id, is_active=True)
        
        # Vérifier que l'utilisateur est membre du groupe
        is_member = group.memberships.filter(
            phone_number=request.user.phone_number,
            left_at__isnull=True
        ).exists()
        
        if not is_member:
            return Response(
                {"detail": "Vous n'êtes pas membre de ce groupe"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Récupérer le compte du groupe
        account = get_object_or_404(Account, owner_group=group, owner_type="GROUP")
        
        return Response({
            "balance": str(account.balance),
            "group_name": group.group_name
        })

class GroupTransactionsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id):

        # 1️⃣ Vérifier groupe
        group = get_object_or_404(ValidationGroup, id=group_id)

        # 2️⃣ Vérifier appartenance
        is_member = GroupMembership.objects.filter(
            group=group,
            phone_number=request.user.phone_number,
            left_at__isnull=True
        ).exists()

        if not is_member:
            return Response(
                {"detail": "Accès refusé"},
                status=403
            )

        # 3️⃣ Récupérer transactions
        transactions = Transaction.objects.select_related("operation").filter(
            operation__group=group
        ).order_by("-operation__created_at")

        # 4️⃣ Serializer manuel (simple)
        data = []
        for tx in transactions:
            data.append({
                "reference": tx.reference,
                "amount": str(tx.amount),
                "recipient": tx.recipient_phone_number,
                "initiator": tx.operation.initiator_phone_number,
                "status": tx.operation.status,
                "created_at": tx.operation.created_at,
            })

        return Response({
            "count": len(data),
            "results": data
        })