from groups.models import ValidationGroup, GroupMembership, GroupRole
from django.db.models import Q

def get_my_groups(user):
    phone = user.phone_number

    # Groupes où l'utilisateur est membre (initiator ou validator)
    memberships = GroupMembership.objects.select_related("group").filter(
        phone_number=phone,
        left_at__isnull=True,
        group__deleted_at__isnull=True,
        group__is_active=True
    )

    results = []

    for membership in memberships:
        group = membership.group

        role = (
            "INITIATOR"
            if membership.role == GroupRole.INITIATOR
            else "VALIDATOR"
        )

        results.append({
            "id": group.id,
            "group_name": group.group_name,
            "role": role,
            "validators_count": GroupMembership.objects.filter(
                group=group,
                role=GroupRole.VALIDATOR,
                left_at__isnull=True
            ).count(),
            "is_active": group.is_active,
            "created_at": group.created_at,
        })

    return {
        "count": len(results),
        "results": results
    }
