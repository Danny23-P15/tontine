from django.urls import path
from auth.views import LoginView

urlpatterns = [
    path("auth/login/", LoginView.as_view()),
]
