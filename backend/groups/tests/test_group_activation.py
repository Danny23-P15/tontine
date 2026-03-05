from django.test import TestCase
from groups.models import ValidationGroup, GroupMembership, GroupRole


class GroupActivationTestCase(TestCase):
    def setUp(self):
        # groupe avec quorum de 1 validateur
        self.group = ValidationGroup.objects.create(
            group_name="Activation Test",
            initiator_phone_number="0340000000",
            quorum=1,
            is_active=False
        )

        # adhésion de l'initiateur (ne compte pas dans le quorum)
        self.initiator = GroupMembership.objects.create(
            group=self.group,
            phone_number="0340000000",
            cin="INIT-CIN",
            role=GroupRole.INITIATOR,
        )

    def test_group_and_members_stay_inactive_until_quorum(self):
        # juste après création, groupe inactif et membre initiateur inactif
        self.group.refresh_from_db()
        self.initiator.refresh_from_db()
        self.assertFalse(self.group.is_active)
        self.assertFalse(self.initiator.is_active)

        # ajout d'un seul validateur -> toujours pas de quorum
        v1 = GroupMembership.objects.create(
            group=self.group,
            phone_number="0341111111",
            cin="VAL1",
            role=GroupRole.VALIDATOR,
        )

        self.group.update_active_status()
        v1.refresh_from_db()
        self.group.refresh_from_db()

        self.assertFalse(self.group.is_active)
        self.assertFalse(v1.is_active)

        # ajout d'un deuxième validateur -> quorum dépassé
        v2 = GroupMembership.objects.create(
            group=self.group,
            phone_number="0342222222",
            cin="VAL2",
            role=GroupRole.VALIDATOR,
        )

        self.group.update_active_status()
        v1.refresh_from_db()
        v2.refresh_from_db()
        self.initiator.refresh_from_db()
        self.group.refresh_from_db()

        self.assertTrue(self.group.is_active)
        # tous les membres non partis doivent devenir actifs
        for m in GroupMembership.objects.filter(group=self.group, left_at__isnull=True):
            self.assertTrue(m.is_active, f"membre {m.phone_number} devrait être actif")

        # et quand on ajoute un nouveau validateur après que le groupe soit actif,
        # il doit hériter de l'état "actif" via la surcouche de save()
        v3 = GroupMembership.objects.create(
            group=self.group,
            phone_number="0343333333",
            cin="VAL3",
            role=GroupRole.VALIDATOR,
        )
        self.assertTrue(v3.is_active)

    def test_group_deactivates_when_validator_leaves(self):
        # préparer un état actif avec deux validateurs
        v1 = GroupMembership.objects.create(
            group=self.group,
            phone_number="0341111111",
            cin="VAL1",
            role=GroupRole.VALIDATOR,
        )
        v2 = GroupMembership.objects.create(
            group=self.group,
            phone_number="0342222222",
            cin="VAL2",
            role=GroupRole.VALIDATOR,
        )
        # atteindre quorum
        self.group.update_active_status()
        self.assertTrue(self.group.is_active)

        # faire partir un validateur en utilisant la méthode utilitaire
        v2.leave_group()
        v1.refresh_from_db()
        self.group.refresh_from_db()

        # le groupe doit redevenir inactif et les membres doivent suivre
        self.assertFalse(self.group.is_active)
        self.assertFalse(v1.is_active)
        self.assertFalse(v2.is_active)
