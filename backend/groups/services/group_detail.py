from groups.models import ValidationGroup, GroupMembership
from django.shortcuts import get_object_or_404
from django.core.exceptions import PermissionDenied

def get_group_detail(user, group_id):
    phone = user.phone_number

    group = get_object_or_404(ValidationGroup, id=group_id)

    # Vérifier appartenance
    membership = GroupMembership.objects.filter(
        group=group,
        phone_number=phone,
        left_at__isnull=True
    ).first()

    if not membership:
        raise PermissionDenied("Vous n'appartenez pas à ce groupe")

    members_qs = GroupMembership.objects.filter(
        group=group,
        left_at__isnull=True
    )

    members = []
    for m in members_qs:
        members.append({
            "phone_number": m.phone_number,
            "cin": m.cin,
            "role": m.role,
            "joined_at": m.joined_at
        })

    return {
        "id": group.id,
        "group_name": group.group_name,
        "quorum": group.quorum,
        "is_active": group.is_active,
        "created_at": group.created_at,

        "me": {
            "role": membership.role
        },

        "members": members
    }
