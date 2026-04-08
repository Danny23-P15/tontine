from django.urls import path
from .views import AdminOperationsView

urlpatterns = [
    path('operations/', AdminOperationsView.as_view(), name='admin-operations'),
]