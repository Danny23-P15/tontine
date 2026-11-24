import shutil
import tempfile
from decimal import Decimal

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from core.models import User
from groups.models import Account, GroupMembership, GroupRole, Transaction, ValidationGroup
from groups.services.operation_service import request_transaction
from groups.services.operation_validation import respond_to_transaction_request


class ReceiptEndpointTestCase(TestCase):
    def setUp(self):
        media = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, media, ignore_errors=True)
        override = override_settings(MEDIA_ROOT=media)
        override.enable()
        self.addCleanup(override.disable)

        self.initiator = User.objects.create_user("0348000000", "INIT", "Initiateur Test", "pwd")
        self.validator = User.objects.create_user("0349000001", "V1", "Validateur Test", "pwd")
        self.outsider = User.objects.create_user("0347000000", "OUT", "Externe Test", "pwd")

        group = ValidationGroup.objects.create(
            group_name="Groupe Tx", initiator_phone_number="0348000000",
            quorum=1, is_active=True,
        )
        GroupMembership.objects.create(
            group=group, phone_number="0348000000", cin="INIT", role=GroupRole.INITIATOR,
        )
        GroupMembership.objects.create(
            group=group, phone_number="0349000001", cin="V1", role=GroupRole.VALIDATOR,
        )
        Account.objects.create(owner_type="GROUP", owner_group=group, balance=Decimal("10000"))

        ok, msg = request_transaction(
            group=group, initiator_phone="0348000000",
            recipient_phone="0350000000", reason="Paiement fournisseur",
            amount=Decimal("1500"),
        )
        self.assertTrue(ok, msg)
        self.operation = group.operations.last()
        self.url = f"/api/operations/{self.operation.reference}/receipt/"
        self.client = APIClient()

    def _execute(self):
        # Sans captureOnCommitCallbacks, le hook ne tourne pas : on simule une
        # transaction exécutée AVANT l'existence des justificatifs.
        respond_to_transaction_request(
            operation=self.operation, validator_phone="0349000001", accept=True,
        )

    def test_initiator_downloads_pdf_and_it_is_generated_lazily(self):
        self._execute()
        tx = Transaction.objects.get(operation=self.operation)
        self.assertFalse(tx.receipt_pdf)

        self.client.force_authenticate(self.initiator)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertIn("attachment", response["Content-Disposition"])
        self.assertTrue(b"".join(response.streaming_content).startswith(b"%PDF"))
        tx.refresh_from_db()
        self.assertTrue(tx.has_receipt)

    def test_validator_can_download(self):
        self._execute()
        self.client.force_authenticate(self.validator)
        self.assertEqual(self.client.get(self.url).status_code, 200)

    def test_outsider_is_refused(self):
        self._execute()
        self.client.force_authenticate(self.outsider)
        self.assertEqual(self.client.get(self.url).status_code, 403)

    def test_not_executed_transaction_has_no_receipt(self):
        self.client.force_authenticate(self.initiator)
        self.assertEqual(self.client.get(self.url).status_code, 409)

    def test_anonymous_is_refused(self):
        self.assertEqual(self.client.get(self.url).status_code, 401)