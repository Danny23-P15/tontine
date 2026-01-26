from groups.models import GroupMembership, GroupRole


MAX_GROUPS_PER_USER = 3


def count_active_groups(phone_number):
    return GroupMembership.objects.filter(
        phone_number=phone_number,
        left_at__isnull=True
    ).count()


def is_initiator(phone_number):
    return GroupMembership.objects.filter(
        phone_number=phone_number,
        role=GroupRole.INITIATOR,
        left_at__isnull=True
    ).exists()


def can_add_validator(phone_number):
    """
    Un numéro ne peut appartenir qu’à 3 groupes max
    """
    return count_active_groups(phone_number) < MAX_GROUPS_PER_USER
