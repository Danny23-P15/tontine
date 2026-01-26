from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from api.views import PhoneTokenObtainPairView
from api.views import MeAPIView, UserListAPIView


urlpatterns = [
    path("auth/token/", PhoneTokenObtainPairView.as_view(), name="token"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", MeAPIView.as_view()),   
    path("users/", UserListAPIView.as_view()),

]
