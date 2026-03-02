from groups.models import ValidationGroup, GroupMembership, Operation, OperationType, OperationStatus
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

    # déterminer s'il existe déjà une demande de suppression en attente
    pending_delete = Operation.objects.filter(
        group=group,
        operation_type=OperationType.DELETE_GROUP,
        status=OperationStatus.PENDING,
    ).exists()

    # déterminer s'il existe des opérations en attente (autres que suppression)
    has_pending_operations = Operation.objects.filter(
        group=group,
        status=OperationStatus.PENDING,
    ).exclude(
        operation_type=OperationType.DELETE_GROUP
    ).exists()

    return {
        "id": group.id,
        "group_name": group.group_name,
        "quorum": group.quorum,
        "is_active": group.is_active,
        "created_at": group.created_at,

        "me": {
            "role": membership.role
        },

        "members": members,
        # flag added for frontend to know a deletion request is pending
        "pending_deletion": pending_delete,
        # flag to prevent deletion if there are pending operations
        "has_pending_operations": has_pending_operations,
    }
