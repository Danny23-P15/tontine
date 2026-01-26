from django.urls import path
from notifications.views import PendingNotificationsAPIView

urlpatterns = [
    path("pending/", PendingNotificationsAPIView.as_view(), name="pending-notifications"),
]
