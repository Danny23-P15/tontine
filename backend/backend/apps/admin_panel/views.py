from urllib import request

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
import logging

from core.permission import IsSuperAdmin
from groups.models import Operation
from backend.apps.admin_panel.services import override_operation, substitute_validator_response

logger = logging.getLogger(__name__)

class AdminOperationsView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        print("=" * 50)
        print("USER:", request.user)
        print("AUTH:", request.user.is_authenticated)
        print("ROLE:", request.user.role if hasattr(request.user, 'role') else "N/A")
        print("IS_SUPERADMIN:", request.user.is_superadmin if hasattr(request.user, 'is_superadmin') else "N/A")
        print("=" * 50)
        
        operations = Operation.objects.all().order_by("-created_at")[:100]

        data = [
            {
                # "operation_reference": op.operation_reference,
                "operation_type": op.operation_type,
                "group_name": op.group.group_name,
                "initiator_phone_number": op.initiator_phone_number,
                # "quorum": op.quorum,
                "created_at": op.created_at,
            }
            for op in operations
        ]

        logger.info(f"USER = {request.user}")
        logger.info(f"ROLE = {request.user.role}")
        logger.info(f"IS SUPERADMIN = {request.user.is_superadmin}")
        print("✓ Response data prepared with", len(data), "operations")
        return Response(data)
    
class AdminOverrideOperationAPIView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request, operation_id):
        decision = request.data.get("decision")

        try:
            operation = Operation.objects.get(id=operation_id)
        except Operation.DoesNotExist:
            return Response({"detail": "Opération introuvable"}, status=404)

        success, message = override_operation(
            operation=operation,
            admin_user=request.user,
            decision=decision
        )

        if not success:
            return Response({"detail": message}, status=400)

        return Response({"detail": message}, status=200)
    

class AdminSubstituteValidatorAPIView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request, operation_id):
        try:
            operation = Operation.objects.get(id=operation_id)
        except Operation.DoesNotExist:
            return Response({"detail": "Operation not found"}, status=404)

        success, message = substitute_validator_response(
            operation=operation,
            validator_phone_number=request.data.get("validator_phone_number"),
            admin_user=request.user,
            decision=request.data.get("decision"),
            rejection_reason=request.data.get("rejection_reason")
        )

        if not success:
            return Response({"detail": message}, status=400)

        return Response({"detail": message}, status=200)