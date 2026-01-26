from django.db import models


class NotificationSourceType(models.TextChoices):
    TEMP_GROUP_CREATION = "TEMP_GROUP_CREATION"
    OPERATION = "OPERATION"
    GROUP = "GROUP"
    # extensible plus tard (FINANCIAL_OPERATION, etc.)


class NotificationActionType(models.TextChoices):
    VALIDATE_GROUP_CREATION = "VALIDATE_GROUP_CREATION"
    VALIDATE_OPERATION = "VALIDATE_OPERATION"
    NONE = "NONE"


class Notification(models.Model):
    # 🔹 Destinataire
    recipient_phone_number = models.CharField(
        max_length=20,
        db_index=True
    )

    # 🔹 Contenu affiché
    title = models.CharField(max_length=150)
    message = models.TextField()

    # 🔹 Source métier (abstraction clé)
    source_type = models.CharField(
        max_length=30,
        choices=NotificationSourceType.choices
    )

    source_reference = models.CharField(
        max_length=100,
        db_index=True
    )
    # ex:
    # - TemporaryGroupCreation.reference
    # - Operation.reference
    # - Group.id

    payload = models.JSONField(
        null=True,
        blank=True
    )
    # données utiles pour le frontend (group_name, quorum, initiator, etc.)

    # 🔹 Action utilisateur (remplace PendingOperation)
    action_required = models.BooleanField(default=False)

    action_type = models.CharField(
        max_length=40,
        choices=NotificationActionType.choices,
        default=NotificationActionType.NONE
    )

    available_actions = models.JSONField(
        null=True,
        blank=True
    )
    # ex: ["APPROVE", "REJECT"]

    # 🔹 État
    is_read = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.recipient_phone_number}] {self.title}"
