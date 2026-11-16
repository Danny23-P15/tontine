from django.urls import path
from notifications.views import (
    PendingNotificationsAPIView,
    PendingNotificationDetailAPIView,
    NotificationInboxAPIView,
    NotificationDetailAPIView
)

urlpatterns = [
    path("pending/", PendingNotificationsAPIView.as_view(), name="pending-notifications"),
    path("pending/<str:request_id>/",PendingNotificationDetailAPIView.as_view(),name="pending-notification-detail"),
    path("inbox/", NotificationInboxAPIView.as_view()),
    path("<int:notification_id>/", NotificationDetailAPIView.as_view(), name="notification-detail"),
]
