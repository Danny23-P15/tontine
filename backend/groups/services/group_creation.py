from datetime import timedelta
from django.utils import timezone
from groups.models import TemporaryGroupCreation
from groups.models import TemporaryGroupValidator
from groups.services.group_rules import *
from notifications.services.notification_service import *

def create_group_request(
    initiator_phone: str,
    group_name: str,
    quorum: int,
    validators: list[dict]
):

    allowed, reason = can_create_group(initiator_phone)
    if not allowed:
        return False, reason, None
    #sinon miretourne success, reason, temp_group

    temp_group = TemporaryGroupCreation.objects.create(
        initiator_phone_number=initiator_phone,
        group_name=group_name,
        quorum=quorum,
        expires_at=timezone.now() + timedelta(hours=48)
    )

    temp_validators = []

    for v in validators:
        allowed, reason = can_add_validator_to_temp_group(
            initiator_phone=initiator_phone,
            validator_phone=v["phone_number"],
            validator_cin=v["cin"],
            temp_validators=temp_validators
        )

        if not allowed:
            temp_group.is_cancelled = True
            temp_group.save(update_fields=["is_cancelled"])
            return False, reason, None

        temp_validators.append(v)

        TemporaryGroupValidator.objects.create(
            temp_group=temp_group,
            phone_number=v["phone_number"],
            cin=v["cin"]
        )

        notify(
            recipient_phone=initiator_phone,
            title="Création de groupe en attente",
            message=(
                f"La demande de création du groupe"
                f" {group_name} a été envoyée "
                f"aux validateurs."
            )
        )

    return True, None, temp_group

# -temporaire
# -attend l'accord des validateurs
# -peut être annulée
# -peut échouer avant même d'exister

# On ne crée jamais de données temporaires si la demande est invalide.
#is_ has