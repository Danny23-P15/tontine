from notifications.mapping import OPERATION_NOTIFICATION_MAP
from notifications.services.notification_service import notify
from groups.models import *
from notifications.constants import OperationEvent
# from notifications.models import NotificationType
from notifications.services.recipients import initiator_only, validators_only


from notifications.mapping import OPERATION_NOTIFICATION_MAP
from notifications.models import Notification, NotificationSourceType
from groups.models import GroupMembership, GroupRole
from notifications.services.notification_service import notify
from notifications.constants import OperationEvent
from groups.models import GroupMembership, GroupRole


def notify_operation_status(
    *,
    source : TemporaryGroupCreation | Operation | ValidationGroup,
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
        "group_name": getattr(source, "name", None),
        "validator_phone": actor_phone,
    }

    # =========================
    # 🔔 Création des notifications
    # =========================
    # Notification.source_reference = f"{source_type.lower()}-{source.id}"
    source_reference = f"{source_type.lower()}-{source.id}"


    for phone in recipients:
        Notification.objects.create(
            recipient_phone_number=phone,
            title=config["title"],
            message=config["message"].format(**context),
            source_type=source_type,
            # source_id=source.id,
            source_reference=source_reference,
            # actionable=config.get("actionable", False),
        )


