from django.urls import path
from groups.views import *


urlpatterns = [
    path("groups/create-request/", CreateGroupRequestAPIView.as_view()),
    path("groups/creation/respond", RespondGroupCreationAPIView.as_view()),
    path("groups/my-groups/", MyGroupsAPIView.as_view()),
    path("groups/<int:group_id>/", GroupDetailAPIView.as_view()), 
    path("groups/<int:group_id>/validator/add/", AddValidatorAPIView.as_view()),
    path("operations/add-validator/respond/", RespondAddValidatorAPIView.as_view()),
    path("operations/respond/", RespondAddValidatorAPIView.as_view()),

]
