# notifications/tests/test_tasks.py

from django.test import TestCase
from django.utils import timezone
from freezegun import freeze_time
from datetime import timedelta
from notifications.models import Notification
from notifications.tasks import cleanup_old_notifications

class TestCleanupNotifications(TestCase):

    def _create_notification(self, phone="+261340000000", **kwargs):
        return Notification.objects.create(
            recipient_phone_number=phone,
            title="Test",
            message="Test message",
            **kwargs
        )

    @freeze_time("2024-01-01 12:00:00")
    def test_notification_recente_non_supprimee(self):
        """Une notification de 1 jour ne doit PAS être supprimée."""
        self._create_notification()  # créée le 2024-01-01

        with freeze_time("2024-01-02 12:00:00"):  # 1 jour après
            result = cleanup_old_notifications()

        self.assertEqual(Notification.objects.count(), 1)
        self.assertEqual(result["deleted"], 0)

    @freeze_time("2024-01-01 12:00:00")
    def test_notification_ancienne_supprimee(self):
        """Une notification de +3 jours DOIT être supprimée."""
        self._create_notification()  # créée le 2024-01-01

        with freeze_time("2024-01-05 12:00:00"):  # 4 jours après
            result = cleanup_old_notifications()

        self.assertEqual(Notification.objects.count(), 0)
        self.assertEqual(result["deleted"], 1)

    @freeze_time("2024-01-01 12:00:00")
    def test_mix_notifications(self):
        """Seules les anciennes sont supprimées, les récentes restent."""
        self._create_notification(phone="+261340000001")  # ancienne
        
        with freeze_time("2024-01-03 13:00:00"):  # créée 2j après
            self._create_notification(phone="+261340000002")  # récente

        with freeze_time("2024-01-05 12:00:00"):  # 4 jours après le début
            result = cleanup_old_notifications()

        self.assertEqual(Notification.objects.count(), 1)  # seule la récente reste
        self.assertEqual(result["deleted"], 1)