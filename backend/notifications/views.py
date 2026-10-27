from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from notifications.services.pending_notifications import get_pending_notifications, get_notification_inbox
from notifications.models import Notification


class PendingNotificationsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = get_pending_notifications(request.user)
        print("USER CONNECTÉ:", request.user.phone_number)

        return Response(data, status=status.HTTP_200_OK)

class NotificationInboxAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = get_notification_inbox(request.user)
        return Response(data, status=status.HTTP_200_OK)

class NotificationDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, notification_id):
        try:
            notification = Notification.objects.get(id=notification_id, recipient_phone_number=request.user.phone_number)
            notification.delete()
            return Response({"detail": "Notification supprimée"}, status=status.HTTP_204_NO_CONTENT)
        except Notification.DoesNotExist:
            return Response({"detail": "Notification non trouvée"}, status=status.HTTP_404_NOT_FOUND)
