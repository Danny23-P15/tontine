from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from groups.serializers import CreateGroupRequestSerializer
from groups.services.group_creation import create_group_request
from groups.services.group_validation import respond_to_group_creation
from groups.serializers import RespondGroupCreationSerializer




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
