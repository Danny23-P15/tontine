from groups.models import ValidationGroup, GroupMembership, GroupRole

def get_initiator_groups(user):
    """
    Retourne la liste des groupes dont l'utilisateur est INITIATEUR et qui sont ACTIFS
    """
    phone = user.phone_number

    # Groupes où l'utilisateur est INITIATEUR
    memberships = GroupMembership.objects.select_related("group").filter(
        phone_number=phone,
        role=GroupRole.INITIATOR,
        left_at__isnull=True,
        group__deleted_at__isnull=True,
        group__is_active=True
    )

    results = []

    for membership in memberships:
        group = membership.group

        results.append({
            "id": group.id,
            "group_name": group.group_name,
            "quorum": group.quorum,
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
