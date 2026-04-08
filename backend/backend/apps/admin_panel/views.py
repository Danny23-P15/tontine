from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
import logging

from core.permission import IsSuperAdmin
from groups.models import Operation

logger = logging.getLogger(__name__)

class AdminOperationsView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
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
        # return Response({"message": "Bienvenue dans le panneau d'administration!"})
        return Response(data)