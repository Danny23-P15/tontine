from django.urls import path
from .views import AdminOperationsView, AdminOverrideOperationAPIView

urlpatterns = [
    path('operations/', AdminOperationsView.as_view(), name='admin-operations'),
    path('operations/<int:operation_id>/override/', AdminOverrideOperationAPIView.as_view(), name='admin-override-operation'),
]