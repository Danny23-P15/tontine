from django.urls import path
from groups.views import CreateGroupRequestAPIView
from groups.views import RespondGroupCreationAPIView


urlpatterns = [
    path("groups/create-request/", CreateGroupRequestAPIView.as_view()),
    path("groups/creation/respond", RespondGroupCreationAPIView.as_view()),

]
