from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase

from groups.services.group_rules import (
    can_add_validator_to_temp_group,
    can_remove_validator,
)


class CanAddValidatorToTempGroupTests(SimpleTestCase):
    @patch("groups.services.group_rules.get_user_group_stats")
    def test_allows_validator_with_fewer_than_three_groups(self, get_stats):
        get_stats.return_value = {"total_groups": 2}

        result = can_add_validator_to_temp_group(
            "initiator",
            "validator",
            "cin-1",
            [],
        )

        self.assertEqual(result, (True, None))

    @patch("groups.services.group_rules.get_user_group_stats")
    def test_rejects_validator_who_already_belongs_to_three_groups(self, get_stats):
        get_stats.return_value = {"total_groups": 3}

        result = can_add_validator_to_temp_group(
            "initiator",
            "validator",
            "cin-1",
            [],
        )

        self.assertEqual(result, (False, "Ce numéro appartient déjà à 3 groupes"))

    @patch("groups.services.group_rules.get_user_group_stats")
    def test_rejects_initiator_as_validator(self, get_stats):
        get_stats.return_value = {"total_groups": 0}

        result = can_add_validator_to_temp_group(
            "same-phone",
            "same-phone",
            "cin-1",
            [],
        )

        self.assertEqual(result, (False, "Vous ne pouvez pas vous ajouter vous-même"))


class CanRemoveValidatorTests(SimpleTestCase):
    @patch("groups.services.group_rules.has_pending_non_transaction_operations")
    @patch("groups.services.group_rules.GroupMembership.objects.filter")
    @patch("groups.services.group_rules.GroupMembership.objects.get")
    def test_rejects_removal_when_remaining_validators_equal_quorum(
        self, get_membership, filter_memberships, has_pending_operations
    ):
        has_pending_operations.return_value = False
        get_membership.return_value = object()
        filter_memberships.return_value.count.return_value = 3
        group = SimpleNamespace(initiator_phone_number="initiator", quorum=2)

        result = can_remove_validator(group, "validator-to-remove")

        self.assertEqual(
            result,
            (
                False,
                "Impossible de supprimer ce validateur : "
                "le nombre de validateurs restants doit être supérieur au quorum",
            ),
        )
