from django.urls import path
from notifications.views import PendingNotificationsAPIView, NotificationInboxAPIView, NotificationDetailAPIView

urlpatterns = [
    path("pending/", PendingNotificationsAPIView.as_view(), name="pending-notifications"),
    path("inbox/", NotificationInboxAPIView.as_view()),
    path("<int:notification_id>/", NotificationDetailAPIView.as_view(), name="notification-detail"),
]
