from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from core.models import User
from groups.models import (
    Operation,
    OperationStatus,
    OperationType,
    TemporaryGroupCreation,
    TemporaryGroupValidator,
    ValidationGroup,
)
from groups.views import ValidatorSuggestionsAPIView


class ValidatorSuggestionsTests(TestCase):
    def test_excludes_users_with_active_temporary_or_add_validator_requests(self):
        initiator = User.objects.create_user(
            phone_number="0320000001",
            cin="cin-initiator",
            full_name="Initiator",
        )
        temporary_validator = User.objects.create_user(
            phone_number="0340000001",
            cin="cin-temporary",
            full_name="Temporary Validator",
        )
        available_validator = User.objects.create_user(
            phone_number="0340000002",
            cin="cin-available",
            full_name="Available Validator",
        )
        existing_group_validator = User.objects.create_user(
            phone_number="0340000003",
            cin="cin-existing-group",
            full_name="Existing Group Validator",
        )
        temp_group = TemporaryGroupCreation.objects.create(
            initiator_phone_number=initiator.phone_number,
            group_name="Pending group",
            quorum=1,
            expires_at=timezone.now() + timedelta(days=1),
        )
        TemporaryGroupValidator.objects.create(
            temp_group=temp_group,
            phone_number=temporary_validator.phone_number,
            cin=temporary_validator.cin,
        )
        existing_group = ValidationGroup.objects.create(
            group_name="Existing group",
            initiator_phone_number=initiator.phone_number,
            quorum=1,
            is_active=True,
        )
        Operation.objects.create(
            reference="OP-PENDING-ADD-VALIDATOR",
            group=existing_group,
            initiator_phone_number=initiator.phone_number,
            operation_type=OperationType.ADD_VALIDATOR,
            status=OperationStatus.PENDING,
            payload={
                "validator_phone_number": existing_group_validator.phone_number,
                "cin": existing_group_validator.cin,
            },
            expires_at=timezone.now() + timedelta(days=1),
        )

        request = APIRequestFactory().get(
            "/groups/validator-suggestions/",
            {"phone": "034"},
        )
        force_authenticate(request, user=initiator)

        response = ValidatorSuggestionsAPIView.as_view()(request)

        self.assertEqual(
            [result["phone_number"] for result in response.data["results"]],
            [available_validator.phone_number],
        )
