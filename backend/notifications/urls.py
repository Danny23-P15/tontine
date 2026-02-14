from django.urls import path
from notifications.views import PendingNotificationsAPIView, NotificationInboxAPIView

urlpatterns = [
    path("pending/", PendingNotificationsAPIView.as_view(), name="pending-notifications"),
    path("inbox/", NotificationInboxAPIView.as_view()),

]
