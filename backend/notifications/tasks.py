import logging
from celery import shared_task
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from .models import Notification

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def cleanup_old_notifications(self):
    """
    Supprime les notifications plus anciennes que NOTIFICATION_RETENTION_DAYS.
    Exécutée quotidiennement via Celery Beat.
    """
    try:
        retention_days = getattr(settings, "NOTIFICATION_RETENTION_DAYS", 3)
        cutoff_time = timezone.now() - timedelta(days=retention_days)

        deleted_count, _ = Notification.objects.filter(
            created_at__lt=cutoff_time
        ).delete()

        logger.info(f"[Notifications] Purge terminée : {deleted_count} supprimée(s)")
        return {"deleted": deleted_count, "cutoff": cutoff_time.isoformat()}

    except Exception as exc:
        logger.error(f"[Notifications] Erreur lors de la purge : {exc}")
        raise self.retry(exc=exc)