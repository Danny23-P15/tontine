from django.test import TestCase
from django.utils import timezone

from groups.models import ValidationGroup, GroupMembership, GroupRole
from groups.models import Operation, OperationType, OperationStatus, OperationValidation
from groups.services.group_validation import respond_to_group_deletion
from groups.services.group_detail import get_group_detail
from groups.services.operation_service import request_delete_group


class DeleteGroupTestCase(TestCase):

    def setUp(self):
        self.group = ValidationGroup.objects.create(
            group_name="Groupe Test",
            initiator_phone_number="0341111111",
            quorum=2,
            is_active=True
        )

        GroupMembership.objects.create(
            group=self.group,
            phone_number="0341111111",
            cin="CIN-INIT",
            role=GroupRole.INITIATOR,
            is_active=True
        )

        self.validators = [
            ("0342222222", "CIN-222"),
            ("0343333333", "CIN-333"),
        ]

        for phone,cin in self.validators:
            GroupMembership.objects.create(
                group=self.group,
                phone_number=phone,
                cin = cin,
                role=GroupRole.VALIDATOR,
                is_active=True
            )

        # operation will be created by individual tests when needed
        self.operation = None

    def test_group_not_deleted_if_one_validation_pending(self):
        # create operation using service to get real validations
        success, msg = request_delete_group(
            group=self.group,
            initiator_phone="0341111111"
        )
        self.assertTrue(success)
        # fetch the created operation
        self.operation = Operation.objects.filter(group=self.group).order_by("-id").first()
        # ensure a reference was generated
        self.assertIsNotNone(self.operation.reference)
        self.assertTrue(self.operation.reference.startswith("OP-"))

        # approve only first validation
        validation = self.operation.validations.first()
        validation.status = OperationStatus.APPROVED
        validation.save()

        respond_to_group_deletion(self.operation)

        self.group.refresh_from_db()
        self.operation.refresh_from_db()

        self.assertTrue(self.group.is_active)
        self.assertIsNone(self.group.deleted_at)
        self.assertEqual(self.operation.status, OperationStatus.PENDING)

    def test_group_deleted_when_all_validators_approve(self):
        success, msg = request_delete_group(
            group=self.group,
            initiator_phone="0341111111"
        )
        self.assertTrue(success)
        self.operation = Operation.objects.filter(group=self.group).order_by("-id").first()

        for validation in self.operation.validations.all():
            validation.status = OperationStatus.APPROVED
            validation.save()

        respond_to_group_deletion(self.operation)

        self.group.refresh_from_db()
        self.operation.refresh_from_db()

        self.assertFalse(self.group.is_active)
        self.assertIsNotNone(self.group.deleted_at)
        self.assertEqual(self.operation.status, OperationStatus.APPROVED)

        active_members = GroupMembership.objects.filter(
            group=self.group,
            left_at__isnull=True
        ).count()

        self.assertEqual(active_members, 0)

    def test_group_not_deleted_if_one_validator_rejects(self):
        success, msg = request_delete_group(
            group=self.group,
            initiator_phone="0341111111"
        )
        self.assertTrue(success)
        self.operation = Operation.objects.filter(group=self.group).order_by("-id").first()

        validations = list(self.operation.validations.all())
        validations[0].status = OperationStatus.REJECTED
        validations[0].save()

        validations[1].status = OperationStatus.APPROVED
        validations[1].save()

        respond_to_group_deletion(self.operation)

        self.group.refresh_from_db()
        self.operation.refresh_from_db()

        self.assertTrue(self.group.is_active)
        self.assertIsNone(self.group.deleted_at)
        self.assertEqual(self.operation.status, OperationStatus.REJECTED)

    def test_group_detail_service_includes_pending_flag(self):
        from types import SimpleNamespace
        user = SimpleNamespace(phone_number="0341111111")

        # before any request, should be False
        detail = get_group_detail(user, self.group.id)
        self.assertFalse(detail.get("pending_deletion"))

        # create operation through service
        success, msg = request_delete_group(
            group=self.group,
            initiator_phone="0341111111"
        )
        self.assertTrue(success)

        detail_after = get_group_detail(user, self.group.id)
        self.assertTrue(detail_after.get("pending_deletion"))
