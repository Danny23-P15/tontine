# notifications/services/recipients.py

from groups.models import GroupMembership, GroupRole


def initiator_only(operation):
    return [operation.initiator_phone_number]


def validators_only(operation):
    return GroupMembership.objects.filter(
        group=operation.group,
        role=GroupRole.VALIDATOR,
        left_at__isnull=True
    ).values_list("phone_number", flat=True)
    