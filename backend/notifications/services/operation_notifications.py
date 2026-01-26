from notifications.mapping import OPERATION_NOTIFICATION_MAP
from notifications.services.notification_service import notify
from groups.models import GroupMembership, GroupRole
from notifications.constants import OperationEvent
# from notifications.models import NotificationType
from notifications.services.recipients import initiator_only, validators_only


from notifications.mapping import OPERATION_NOTIFICATION_MAP
from notifications.models import Notification, NotificationSourceType
from groups.models import GroupMembership, GroupRole, ValidationGroup
from notifications.services.notification_service import notify
from notifications.constants import OperationEvent
from groups.models import GroupMembership, GroupRole


def notify_operation_status(
    *,
    source,
    event: OperationEvent,
    actor_phone: str | None = None,
):
    """
    Envoie les notifications selon l'événement et le mapping.
    Aucune logique métier ici.
    """

    config = OPERATION_NOTIFICATION_MAP.get(event)
    if not config:
        return

    source_type = config["source_type"]
    recipients = set()

    # =========================
    # 🎯 Détermination du groupe
    # =========================

    group = None

    if source_type == NotificationSourceType.TEMP_GROUP_CREATION:
        group = None  # pas encore de groupe

    elif source_type == NotificationSourceType.OPERATION:
        group = source.group

    elif source_type == NotificationSourceType.GROUP:
        group = source

    # =========================
    # 👥 Détermination des destinataires
    # =========================

    for target in config["recipients"]:

        if target == "initiator":
            recipients.add(source.initiator_phone_number)

        elif target == "validators":

            if source_type == NotificationSourceType.TEMP_GROUP_CREATION:
                phones = source.validators.values_list(
                    "phone_number", flat=True
                )
                recipients.update(phones)

            elif group:
                phones = GroupMembership.objects.filter(
                    group=group,
                    role=GroupRole.VALIDATOR,
                    left_at__isnull=True
                ).values_list("phone_number", flat=True)
                recipients.update(phones)

        elif target == "validator":
            if actor_phone:
                recipients.add(actor_phone)

    # =========================
    # 📝 Contexte du message
    # =========================

    context = {
        "group_name": getattr(source, "group_name", None),
        "validator_phone": actor_phone,
    }

    # =========================
    # 🔔 Création des notifications
    # =========================

    for phone in recipients:
        Notification.objects.create(
            recipient_phone_number=phone,
            title=config["title"],
            message=config["message"].format(**context),
            source_type=source_type,
            source_id=source.id,
            actionable=config.get("actionable", False),
        )



# OPERATION_NOTIFICATION_MAP = {

#     OperationEvent.VALIDATOR_ADDED: {
#         "recipients": initiator_only,
#         "title": "Validateur ajouté",
#         "message": lambda op: (
#             f"Le validateur {op.payload['validator_phone_number']} "
#             f"a été ajouté au groupe « {op.group.group_name} »."
#         ),
#         "type": NotificationType.ADD_VALIDATOR_APPROVED
#     },

#     OperationEvent.ADD_VALIDATOR_REJECTED: {
#         "recipients": initiator_only,
#         "title": "Ajout de validateur refusé",
#         "message": lambda op: (
#             f"L’ajout du validateur {op.payload['validator_phone_number']} "
#             f"a été refusé."
#         ),
#         "type": NotificationType.ADD_VALIDATOR_REJECTED
#     },

#     OperationEvent.VALIDATOR_REMOVED: {
#         "recipients": initiator_only,
#         "title": "Validateur supprimé",
#         "message": lambda op: (
#             f"Le validateur {op.payload['validator_phone_number']} "
#             f"a été retiré du groupe « {op.group.group_name} »."
#         ),
#         "type": NotificationType.VALIDATOR_REMOVED
#     },

#     OperationEvent.REMOVE_VALIDATOR_REJECTED: {
#         "recipients": initiator_only,
#         "title": "Suppression de validateur refusée",
#         "message": lambda op: (
#             f"La suppression du validateur {op.payload['validator_phone_number']} "
#             f"a été refusée."
#         ),
#         "type": NotificationType.REMOVE_VALIDATOR_REJECTED
#     },

# }
