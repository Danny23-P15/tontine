import hashlib
import shutil
import tempfile
from decimal import Decimal

from django.test import TestCase, override_settings

from groups.models import Account, GroupMembership, GroupRole, Transaction, ValidationGroup
from groups.services.operation_service import request_transaction
from groups.services.operation_validation import respond_to_transaction_request
from groups.services.receipt_service import generate_receipt


class ReceiptServiceTestCase(TestCase):
    def setUp(self):
        media = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, media, ignore_errors=True)
        override = override_settings(MEDIA_ROOT=media)
        override.enable()
        self.addCleanup(override.disable)

        self.group = ValidationGroup.objects.create(
            group_name="Groupe Tx", initiator_phone_number="0348000000",
            quorum=1, is_active=True,
        )
        GroupMembership.objects.create(
            group=self.group, phone_number="0348000000", cin="INIT", role=GroupRole.INITIATOR,
        )
        GroupMembership.objects.create(
            group=self.group, phone_number="0349000001", cin="V1", role=GroupRole.VALIDATOR,
        )
        self.account = Account.objects.create(
            owner_type="GROUP", owner_group=self.group, balance=Decimal("10000"),
        )

    def _request(self, reason="Paiement fournisseur"):
        ok, msg = request_transaction(
            group=self.group, initiator_phone="0348000000",
            recipient_phone="0350000000", reason=reason, amount=Decimal("1500"),
        )
        self.assertTrue(ok, msg)
        return self.group.operations.last()

    def _accept(self, operation):
        with self.captureOnCommitCallbacks(execute=True):
            respond_to_transaction_request(
                operation=operation, validator_phone="0349000001", accept=True,
            )
        return Transaction.objects.get(operation=operation)

    def test_receipt_generated_after_execution(self):
        tx = self._accept(self._request())

        self.assertTrue(tx.has_receipt)
        tx.receipt_pdf.open("rb")
        data = tx.receipt_pdf.read()
        tx.receipt_pdf.close()
        self.assertTrue(data.startswith(b"%PDF"))
        self.assertEqual(hashlib.sha256(data).hexdigest(), tx.receipt_sha256)

    def test_no_receipt_when_transaction_not_executed(self):
        operation = self._request()          # demande acceptée avec 10 000 Ar

        # Le solde baisse entre la demande et l'exécution
        self.account.balance = Decimal("100")
        self.account.save()

        tx = self._accept(operation)

        self.assertIsNone(tx.executed_at)
        self.assertFalse(tx.has_receipt)
        self.assertIsNone(generate_receipt(tx.pk))
        
    def test_generation_is_idempotent(self):
        tx = self._accept(self._request())
        first_date = tx.receipt_generated_at

        generate_receipt(tx.pk)
        tx.refresh_from_db()

        self.assertEqual(tx.receipt_generated_at, first_date)

    def test_special_characters_in_reason_do_not_break_pdf(self):
        tx = self._accept(self._request(reason="Achat <b>riz</b> & huile"))
        self.assertTrue(tx.has_receipt)