from django.urls import path
from groups.views import *


urlpatterns = [
    path("groups/create-request/", CreateGroupRequestAPIView.as_view()),
    path("groups/creation/pending/", RespondGroupCreationAPIView.as_view()),
    path("groups/creation/respond/", RespondGroupCreationAPIView.as_view()),
    path("groups/creation/cancel/", CancelGroupCreationAPIView.as_view()),
    path("groups/my-groups/", MyGroupsAPIView.as_view()),
    path("groups/my-initiator-groups/", MyInitiatorGroupsAPIView.as_view()),
    path("groups/<int:group_id>/", GroupDetailAPIView.as_view()), 
    path("groups/<int:group_id>/validator/add/", AddValidatorAPIView.as_view()),
    # path("operations/add-validator/respond/", RespondAddValidatorAPIView.as_view()),
    path("operations/respond/", RespondOperationAPIView.as_view()),
    path("groups/<int:group_id>/remove-validator/",RemoveValidatorAPIView.as_view(),name="remove-validator"),
    path("groups/delete/request/",RequestDeleteGroupAPIView.as_view()),
    path("operations/initiated/", MyInitiatedOperationsAPIView.as_view()),
    path("operations/cancel/", CancelOperationAPIView.as_view()),
    path("groups/<int:group_id>/transactions/request/", RequestTransactionAPIView.as_view(), name="request-transaction"),
    path("groups/<int:group_id>/balance/", GroupBalanceAPIView.as_view(), name="group-balance"),
    path("groups/<int:group_id>/transactions/history/",GroupTransactionsAPIView.as_view()),

]
