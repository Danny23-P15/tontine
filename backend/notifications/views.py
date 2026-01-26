from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from notifications.services.pending_notifications import get_pending_notifications


class PendingNotificationsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = get_pending_notifications(request.user)
        return Response(data, status=status.HTTP_200_OK)
