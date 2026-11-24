from decimal import Decimal

from django.test import TestCase

from groups.models import (
    Account, GroupMembership, GroupRole, OperationStatus, Transaction, ValidationGroup,
)
from groups.services.operation_service import request_transaction
from groups.services.operation_validation import respond_to_transaction_request


class TransactionIdempotenceTestCase(TestCase):
    def setUp(self):
        self.group = ValidationGroup.objects.create(
            group_name="Groupe Tx", initiator_phone_number="0348000000",
            quorum=1, is_active=True,
        )
        GroupMembership.objects.create(
            group=self.group, phone_number="0348000000", cin="INIT", role=GroupRole.INITIATOR,
        )
        for phone, cin in (("0349000001", "V1"), ("0349000002", "V2")):
            GroupMembership.objects.create(
                group=self.group, phone_number=phone, cin=cin, role=GroupRole.VALIDATOR,
            )
        self.account = Account.objects.create(
            owner_type="GROUP", owner_group=self.group, balance=Decimal("10000"),
        )
        ok, msg = request_transaction(
            group=self.group, initiator_phone="0348000000",
            recipient_phone="0350000000", reason="Paiement fournisseur",
            amount=Decimal("1500"),
        )
        self.assertTrue(ok, msg)
        self.operation = self.group.operations.last()

    def test_second_validator_cannot_trigger_a_second_debit(self):
        ok1, _ = respond_to_transaction_request(
            operation=self.operation, validator_phone="0349000001", accept=True,
        )
        self.assertTrue(ok1)

        ok2, _ = respond_to_transaction_request(
            operation=self.operation, validator_phone="0349000002", accept=True,
        )
        self.assertFalse(ok2)  # opération déjà clôturée

        self.account.refresh_from_db()
        self.assertEqual(self.account.balance, Decimal("8500"))  # débité UNE seule fois

        tx = Transaction.objects.get(operation=self.operation)
        self.assertIsNotNone(tx.executed_at)
        self.operation.refresh_from_db()
        self.assertEqual(self.operation.status, OperationStatus.COMPLETED)

    def test_insufficient_balance_leaves_no_executed_at(self):
        self.account.balance = Decimal("100")
        self.account.save()

        respond_to_transaction_request(
            operation=self.operation, validator_phone="0349000001", accept=True,
        )

        tx = Transaction.objects.get(operation=self.operation)
        self.assertIsNone(tx.executed_at)
        self.operation.refresh_from_db()
        self.assertEqual(self.operation.status, OperationStatus.REJECTED)