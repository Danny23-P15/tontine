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
    ValidationGroup,
    ValidationStatus,
)


class OperationDetailTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.initiator = User.objects.create_user(
            phone_number="0348000000",
            cin="INITIATOR-CIN",
            full_name="Initiateur Test",
            password="test-password",
        )
        self.validator = User.objects.create_user(
            phone_number="0349000000",
            cin="VALIDATOR-CIN",
            full_name="Validateur Test",
            password="test-password",
        )
        self.group = ValidationGroup.objects.create(
            group_name="Groupe Test",
            initiator_phone_number=self.initiator.phone_number,
            quorum=1,
            is_active=True,
        )
        self.operation = Operation.objects.create(
            reference="OP-INITIATOR-DETAIL",
            group=self.group,
            initiator_phone_number=self.initiator.phone_number,
            operation_type=OperationType.TRANSACTION,
            status=OperationStatus.PENDING,
            payload={"amount": "1500"},
            expires_at=timezone.now() + timedelta(hours=1),
        )
        OperationValidation.objects.create(
            operation=self.operation,
            validation_reference="VALIDATION-INITIATOR-DETAIL",
            validator_phone_number=self.validator.phone_number,
            status=ValidationStatus.PENDING,
        )

    def test_initiator_can_view_operation_detail_without_can_respond(self):
        self.client.force_authenticate(user=self.initiator)

        response = self.client.get(
            f"/api/operations/{self.operation.reference}/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["reference"], self.operation.reference)
        self.assertEqual(response.data["initiator_phone_number"], self.initiator.phone_number)
        self.assertFalse(response.data["can_respond"])
        self.assertIsNone(response.data["my_validation_status"])

    def test_unrelated_user_cannot_view_operation_detail(self):
        unrelated = User.objects.create_user(
            phone_number="0347000000",
            cin="UNRELATED-CIN",
            full_name="Utilisateur Test",
            password="test-password",
        )
        self.client.force_authenticate(user=unrelated)

        response = self.client.get(
            f"/api/operations/{self.operation.reference}/"
        )

        self.assertEqual(response.status_code, 403)
