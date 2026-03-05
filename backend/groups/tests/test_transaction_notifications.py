from decimal import Decimal
from django.test import TestCase
from groups.models import ValidationGroup, GroupMembership, GroupRole
from groups.services.operation_service import request_transaction
from notifications.models import Notification


class TransactionNotificationTestCase(TestCase):
    def setUp(self):
        # groupe actif avec quorum 1
        self.group = ValidationGroup.objects.create(
            group_name="Groupe Tx",
            initiator_phone_number="0348000000",
            quorum=1,
            is_active=True
        )

        # initiateur
        GroupMembership.objects.create(
            group=self.group,
            phone_number="0348000000",
            cin="INITCIN",
            role=GroupRole.INITIATOR,
            is_active=True
        )

        # un validateur actif
        self.validator = GroupMembership.objects.create(
            group=self.group,
            phone_number="0349000000",
            cin="VALCIN",
            role=GroupRole.VALIDATOR,
            is_active=True
        )

    def test_validators_notified_on_transaction_request(self):
        success, msg = request_transaction(
            group=self.group,
            initiator_phone="0348000000",
            recipient_phone="0350000000",
            amount=Decimal("1500"),
        )
        self.assertTrue(success, msg)

        # check notification exists for validator
        notif = Notification.objects.filter(recipient_phone_number=self.validator.phone_number)
        self.assertTrue(notif.exists())
        self.assertIn("transaction", notif.first().title.lower())

        # simulate execution of the operation and verify initiator receives notice
        from groups.services.operation_validation import execute_transaction

        operation = self.group.operations.last()
        execute_transaction(operation)

        exec_notif = Notification.objects.filter(
            recipient_phone_number="0348000000",
            title__icontains="exécutée"
        )
        self.assertTrue(exec_notif.exists())
