from django.urls import path
from .views import AdminOperationsView, AdminOverrideOperationAPIView, AdminSubstituteValidatorAPIView

urlpatterns = [
    path('operations/', AdminOperationsView.as_view(), name='admin-operations'),
    path('operations/<int:operation_id>/override/', AdminOverrideOperationAPIView.as_view(), name='admin-override-operation'),
    path('operations/<int:operation_id>/substitute-validator/', AdminSubstituteValidatorAPIView.as_view(), name='admin-substitute-validator-response'),
]