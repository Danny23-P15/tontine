from datetime import timedelta
from django.utils import timezone
from groups.models import TemporaryGroupCreation
from groups.models import TemporaryGroupValidator
from groups.services.group_rules import *
from notifications.services.notification_service import *
from django.db import transaction
from core.models import User
from notifications.services.operation_notifications import notify_operation_status
from notifications.constants import OperationEvent



def get_user_by_phone(phone_number: str):
    try:
        return User.objects.get(phone_number=phone_number, is_active=True)
    except User.DoesNotExist:
        return None


def create_group_request(
    initiator_phone: str,
    group_name: str,
    quorum: int,
    validators: list[dict]
):
    """
    Le client fournit UNIQUEMENT les phone_number des validateurs.
    Le CIN est récupéré côté backend.
    """

    # =========================
    # 🔐 Vérification initiateur
    # =========================
    allowed, reason = can_create_group(initiator_phone)
    if not allowed:
        return False, reason, None
    
    

    # =========================
    # 👥 Validation validateurs
    # =========================
    validated_validators = []

    for v in validators:
        phone = v["phone_number"]

        user = get_user_by_phone(phone)
        if not user:
            return False, f"Utilisateur {phone} introuvable", None

        allowed, reason = can_add_validator_to_temp_group(
            initiator_phone=initiator_phone,
            validator_phone=phone,
            validator_cin=user.cin,
            temp_validators=validated_validators
        )
        if not allowed:
            return False, reason, None

        validated_validators.append({
            "phone_number": phone,
            "cin": user.cin
        })

    # =========================
    # 🧾 Écriture atomique
    # =========================
    with transaction.atomic():

        temp_group = TemporaryGroupCreation.objects.create(
            initiator_phone_number=initiator_phone,
            group_name=group_name,
            quorum=quorum,
            expires_at=timezone.now() + timedelta(hours=48)
        )

        for v in validated_validators:
            TemporaryGroupValidator.objects.create(
                temp_group=temp_group,
                phone_number=v["phone_number"],
                cin=v["cin"]
            )
    # =========================
    # 🔔 Notification validateurs
    # =========================
    notify_operation_status(
        source=temp_group,
        event=OperationEvent.GROUP_CREATION_REQUEST
    )

    # # =========================
    # # 🔔 Notification initiateur
    # # =========================
    # notify(
    #     recipient_phone=initiator_phone,
    #     title="Création de groupe en attente",
    #     message=(
    #         f"La demande de création du groupe "
    #         f"{group_name} a été envoyée aux validateurs."
    #     )
    # )

    return True, None, temp_group


# def create_group_request(
#     initiator_phone: str,
#     group_name: str,
#     quorum: int,
#     validators: list[dict]
# ):
#     """
#     Crée une demande de création de groupe avec validateurs.
#     Toute la validation est faite AVANT l'écriture en base.
#     Aucune création partielle possible.
#     """

#     # =========================
#     # 🔐 Vérification initiateur
#     # =========================
#     allowed, reason = can_create_group(initiator_phone)
#     if not allowed:
#         return False, reason, None

#     # =========================
#     # 👥 Validation des validateurs
#     # =========================
#     validated_validators: list[dict] = []

#     for v in validators:
#         allowed, reason = can_add_validator_to_temp_group(
#             initiator_phone=initiator_phone,
#             validator_phone=v["phone_number"],
#             validator_cin=v["cin"],
#             temp_validators=validated_validators
#         )
#         if not allowed:
#             return False, reason, None

#         validated_validators.append(v)

#     # =========================
#     # 🧾 Écriture en base (atomique)
#     # =========================
#     with transaction.atomic():

#         temp_group = TemporaryGroupCreation.objects.create(
#             initiator_phone_number=initiator_phone,
#             group_name=group_name,
#             quorum=quorum,
#             expires_at=timezone.now() + timedelta(hours=48)
#         )

#         for v in validated_validators:
#             TemporaryGroupValidator.objects.create(
#                 temp_group=temp_group,
#                 phone_number=v["phone_number"],
#                 cin=v["cin"]
#             )

#     # =========================
#     # 🔔 Notification initiateur
#     # =========================
#     notify(
#         recipient_phone=initiator_phone,
#         title="Création de groupe en attente",
#         message=(
#             f"La demande de création du groupe "
#             f"{group_name} a été envoyée aux validateurs."
#         )
#     )

#     return True, None, temp_group


# -temporaire
# -attend l'accord des validateurs
# -peut être annulée
# -peut échouer avant même d'exister

# On ne crée jamais de données temporaires si la demande est invalide.
#is_ has