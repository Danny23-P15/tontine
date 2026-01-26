from django.urls import path
from .views import PendingOperationsView, RespondToOperationView


urlpatterns = [
    path("operations/pending/", PendingOperationsView.as_view()),
    path("operations/respond/", RespondToOperationView.as_view()),
]
