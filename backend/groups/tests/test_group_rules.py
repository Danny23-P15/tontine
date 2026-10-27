from unittest.mock import patch

from django.test import SimpleTestCase

from groups.services.group_rules import can_add_validator_to_temp_group


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
