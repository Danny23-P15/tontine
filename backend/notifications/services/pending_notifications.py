from django.utils import timezone

from groups.models import (
    TemporaryGroupCreation,
    TemporaryGroupValidator
)
from notifications.constants import OperationEvent


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
            "id": f"temp-group-{temp_group.id}",
            "type": "GROUP_CREATION_REQUEST",
            "event": OperationEvent.GROUP_CREATION_REQUEST.value,
            "title": "Création de groupe en attente",
            "message": (
                f"Le groupe « {temp_group.group_name} » "
                f"attend votre validation."
            ),
            "created_at": temp_group.created_at,

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
