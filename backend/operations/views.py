from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from rest_framework import status


from groups.models import OperationValidation, OperationStatus, ValidationStatus
from .serializers import PendingOperationSerializer
from .serializers import RespondOperationSerializer
from groups.services import respond_to_operation_validation

# GET
class PendingOperationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        phone = request.user.phone_number

        validations = (
            OperationValidation.objects
            .select_related("operation", "operation__group")
            .filter(
                validator_phone_number=phone,
                status=ValidationStatus.PENDING,
                operation__status=OperationStatus.PENDING
            )
            .exclude(
                operation__expires_at__lt=timezone.now()
            )
        )

        operations = [v.operation for v in validations]

        serializer = PendingOperationSerializer(
            operations,
            many=True,
            context={"validator_phone": phone}
        )

        return Response(serializer.data)
    

class RespondToOperationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RespondOperationSerializer(
            data=request.data,
            context={"user": request.user}
        )
        serializer.is_valid(raise_exception=True)

        success, message = serializer.save()

        return Response(
            {"success": success, "message": message},
            status=status.HTTP_200_OK if success else status.HTTP_400_BAD_REQUEST
        )


# POST
# class RespondToOperationView(APIView):
#     permission_classes = [IsAuthenticated]

#     def post(self, request):
#         serializer = RespondOperationSerializer(
#             data=request.data,
#             context={"user": request.user}
#         )
#         serializer.is_valid(raise_exception=True)
#         serializer.save()

#         success, message = respond_to_operation_validation(
#             validation_reference=serializer.validated_data["validation_reference"],
#             validator_phone=request.user.phone_number,
#             accept=serializer.validated_data["accept"],
#             rejection_reason=serializer.validated_data.get("rejection_reason")
#         )

#         http_status = (
#             status.HTTP_200_OK if success else status.HTTP_400_BAD_REQUEST
#         )

#         return Response(
#             {
#                 "success": success,
#                 "message": message
#             },
#             status=http_status
#         )