# notifications/services/notification_service.py
from notifications.models import Notification
from groups.models import Operation


def notify(
    *,
    recipient_phone: str,
    title: str,
    message: str,
    operation: Operation | None = None
) -> Notification:
    """
    Crée une notification simple.
    Aucune logique métier ici.
    """

    return Notification.objects.create(
        recipient_phone_number=recipient_phone,
        title=title,
        message=message,
        operation=operation
    )
