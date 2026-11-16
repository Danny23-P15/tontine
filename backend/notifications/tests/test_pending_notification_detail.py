from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import User
from groups.models import (
    Operation,
    OperationStatus,
    OperationType,
    OperationValidation,
    TemporaryGroupCreation,
    TemporaryGroupValidator,
    ValidationGroup,
    ValidationStatus,
)


class PendingNotificationDetailTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.validator = User.objects.create_user(
            phone_number="0349000000",
            cin="VALIDATOR-CIN",
            full_name="Validateur Test",
            password="test-password"
        )
        self.initiator = User.objects.create_user(
            phone_number="0348000000",
            cin="INITIATOR-CIN",
            full_name="Initiateur Test",
            password="test-password"
        )
        self.client.force_authenticate(user=self.validator)

    def test_returns_pending_operation_details_for_validator(self):
        group = ValidationGroup.objects.create(
            group_name="Groupe Test",
            initiator_phone_number=self.initiator.phone_number,
            quorum=1,
            is_active=True
        )
        operation = Operation.objects.create(
            reference="OP-DETAIL-1",
            group=group,
            initiator_phone_number=self.initiator.phone_number,
            operation_type=OperationType.TRANSACTION,
            status=OperationStatus.PENDING,
            payload={"amount": "1500"},
            expires_at=timezone.now() + timedelta(hours=1)
        )
        OperationValidation.objects.create(
            operation=operation,
            validation_reference="VALIDATION-DETAIL-1",
            validator_phone_number=self.validator.phone_number,
            status=ValidationStatus.PENDING
        )

        response = self.client.get(
            f"/api/notifications/pending/transaction-op-{operation.id}/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["operation_type"], "TRANSACTION")
        self.assertEqual(response.data["group"], {
            "id": group.id,
            "name": group.group_name
        })
        self.assertEqual(response.data["initiator"]["full_name"], "Initiateur Test")
        self.assertEqual(response.data["details"]["payload"], {"amount": "1500"})
        self.assertIn("initiated_at", response.data)
        self.assertIn("expires_at", response.data)

    def test_returns_pending_group_creation_details_for_validator(self):
        temp_group = TemporaryGroupCreation.objects.create(
            initiator_phone_number=self.initiator.phone_number,
            group_name="Nouveau groupe",
            quorum=1,
            expires_at=timezone.now() + timedelta(hours=1)
        )
        TemporaryGroupValidator.objects.create(
            temp_group=temp_group,
            phone_number=self.validator.phone_number,
            cin=self.validator.cin,
            has_accepted=None
        )

        response = self.client.get(
            f"/api/notifications/pending/temp-group-{temp_group.id}"
            f"-to-{self.validator.phone_number}/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["operation_type"], "GROUP_CREATION")
        self.assertEqual(response.data["group"]["name"], "Nouveau groupe")
        self.assertEqual(response.data["details"]["quorum"], 1)
        self.assertIn("expires_at", response.data)

    def test_does_not_expose_a_request_to_a_different_validator(self):
        group = ValidationGroup.objects.create(
            group_name="Groupe Test",
            initiator_phone_number=self.initiator.phone_number,
            quorum=1,
            is_active=True
        )
        operation = Operation.objects.create(
            reference="OP-DETAIL-2",
            group=group,
            initiator_phone_number=self.initiator.phone_number,
            operation_type=OperationType.DELETE_GROUP,
            expires_at=timezone.now() + timedelta(hours=1)
        )
        OperationValidation.objects.create(
            operation=operation,
            validation_reference="VALIDATION-DETAIL-2",
            validator_phone_number="0347000000",
            status=ValidationStatus.PENDING
        )

        response = self.client.get(
            f"/api/notifications/pending/delete-group-op-{operation.id}/"
        )

        self.assertEqual(response.status_code, 404)
