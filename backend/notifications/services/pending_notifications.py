from django.utils import timezone

from groups.models import (
    TemporaryGroupCreation,
    TemporaryGroupValidator,
    TemporaryAddValidator,
    GroupRole,
    OperationValidation,
    OperationType,
    ValidationStatus
)
from notifications.constants import OperationEvent
from notifications.models import Notification


def get_pending_notifications(user):
    """
    Retourne toutes les notifications actionnables
    pour l'utilisateur connecté.
    """
        
    phone_number = user.phone_number
    now = timezone.now()

    results = []

    # 1️⃣ Création de groupe (TEMP)

    temp_validations = TemporaryGroupValidator.objects.select_related(
        "temp_group"
    ).filter(
        phone_number=phone_number,
        has_accepted__isnull=True,
        temp_group__is_cancelled=False,
        temp_group__expires_at__gt=now
    )

    for validator in temp_validations:
        temp_group = validator.temp_group

        accepted_count = temp_group.validators.filter(
            has_accepted=True
        ).count()

        results.append({
            "id": f"temp-group-{temp_group.id}-to-{validator.phone_number}",
            "type": "GROUP_CREATION_REQUEST",
            "event": OperationEvent.GROUP_CREATION_REQUEST.value,
            "title": "Création de groupe en attente",
            "message": (
                f"L'utilisateur {temp_group.initiator_phone_number} vous demande d'être un des validateurs du groupe qu'il a créé. "
                f"Nom du groupe: « {temp_group.group_name} » "
                f"quorum: {temp_group.quorum}"
            ),
            "created_at": temp_group.created_at,
            "initiator_phone": temp_group.initiator_phone_number,
            "quorum": temp_group.quorum,

            "action": {
                "endpoint": "/api/groups/creation/respond/",
                "method": "POST",
                "payload": {
                    "temp_group_id": temp_group.id
                }
            },

            "context": {
                "group_name": temp_group.group_name,
                "initiator_phone": temp_group.initiator_phone_number,
                "validators_required": temp_group.validators.count(),
                "validators_accepted": accepted_count
            }
        })

# 2️⃣ Ajout de validateur (TEMP ADD)

# 2️⃣ Ajout de validateur (OPERATION)

    pending_ops = OperationValidation.objects.select_related(
        "operation",
        "operation__group"
    ).filter(
        validator_phone_number=phone_number,
        status=ValidationStatus.PENDING,
        operation__operation_type=OperationType.ADD_VALIDATOR,
        operation__expires_at__gt=now
    )

    for ov in pending_ops:
        operation = ov.operation
        group = operation.group

        accepted_count = OperationValidation.objects.filter(
            operation=operation,
            status=ValidationStatus.ACCEPTED
        ).count()

        results.append({
            "id": f"add-validator-op-{ov.id}",
            "type": "ADD_VALIDATOR_REQUEST",
            "event": OperationEvent.ADD_VALIDATOR_REQUESTED.value,
            "title": "Ajout de validateur",
            "message": (
                f"L’initiateur {operation.initiator_phone_number} "
                f"souhaite ajouter {operation.payload.get('validator_phone_number')} "
                f"au groupe « {group.group_name} »."
            ),
            "created_at": operation.created_at,

            # ✅ ACTION SPÉCIFIQUE AU VALIDATEUR
            "action": {
                "endpoint": "/api/operations/validate/",
                "method": "POST",
                "payload": {
                    "operation_validation_id": ov.id
                }
            },

            "context": {
                "group_name": group.group_name,
                "initiator_phone": operation.initiator_phone_number,
                "validator_to_add": operation.payload.get("validator_phone_number"),
                "validators_required": group.quorum,
                "validators_accepted": accepted_count
            }
        })

        # ===============================
        # (EXTENSION FUTURE)
        # Opérations sur groupes existants
        # ===============================
        # 👉 ADD_VALIDATOR / REMOVE_VALIDATOR / FINANCE
        # même shape, autre "type"

        return {
            "count": len(results),
            "results": results
        }

def get_notification_inbox(user):
    notifications = Notification.objects.filter(
        recipient_phone_number=user.phone_number
    ).order_by("-created_at")

    return {
        "count": notifications.count(),
        "results": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "created_at": n.created_at,
                # "actionable": n.actionable,
                "source_type": n.source_type,
            }
            for n in notifications
        ]
    }
