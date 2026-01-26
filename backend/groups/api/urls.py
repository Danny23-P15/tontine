# groups/api/urls.py
from django.urls import path
from groups.api.views import GroupCreateAPIView
from groups.api.views import OperationCreateAPIView
from groups.api.views import PendingOperationsAPIView
from groups.api.views import RespondToOperationAPIView




urlpatterns = [
    path("groups/", GroupCreateAPIView.as_view(), name="group-create"),
    path("operations/", OperationCreateAPIView.as_view(), name="operation-create"),
    path(
        "operations/pending/",
        PendingOperationsAPIView.as_view(),
        name="operations-pending"
    ),
    path(
        "operations/respond/",
        RespondToOperationAPIView.as_view(),
        name="operations-respond"
    ),
    
]
