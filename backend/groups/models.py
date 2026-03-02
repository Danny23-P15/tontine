from django.db import models
from django.utils import timezone
# from django.db import Q


class GroupRole(models.TextChoices):
    INITIATOR = "INITIATOR", "Initiator"
    VALIDATOR = "VALIDATOR", "Validator"


class ValidationGroup(models.Model):
    group_name = models.CharField(max_length=100)

    initiator_phone_number = models.CharField(
        max_length=20,
        db_index=True
    )

    validator_max_number = models.PositiveIntegerField(default=5)
    quorum = models.PositiveIntegerField()

    is_active = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    def update_active_status(self):
        self.is_active = True
        self.save(update_fields=["is_active"])

# fonction pour décider si le groupe est actif

def update_active_status(self):
    validators_count = self.memberships.filter(
        role=GroupRole.VALIDATOR,
        left_at__isnull=True
    ).count()

    new_status = validators_count > self.quorum

    # éviter les updates inutiles
    if self.is_active != new_status:
        # mise à jour du groupe
        self.is_active = new_status
        self.save(update_fields=["is_active"])

        # synchronisation des membres actifs
        self.memberships.filter(
            left_at__isnull=True
        ).update(is_active=new_status)


class GroupMembership(models.Model):
    group = models.ForeignKey(
        ValidationGroup,
        on_delete=models.CASCADE,
        related_name="memberships"
    )

    phone_number = models.CharField(max_length=20)
    cin = models.CharField(max_length=20)

    role = models.CharField(
        max_length=10,
        choices=GroupRole.choices
    )

    is_active = models.BooleanField(default=False)

    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            
            # Un numéro ne peut apparaître qu’une seule fois par groupe
            models.UniqueConstraint(
                fields=["group", "phone_number"],
                condition=models.Q(left_at__isnull=True),
                name="unique_member_per_group"
            ),

            # Un CIN ne peut apparaître qu’une seule fois par groupe
            models.UniqueConstraint(
                fields=["group", "cin"],
                condition=models.Q(left_at__isnull=True),
                name="unique_cin_per_group"
            ),
        ]

    def leave_group(self):
        """Marque le membre comme sorti du groupe"""
        self.left_at = timezone.now()
        self.is_active = False
        self.save(update_fields=["left_at", "is_active"])
        self.group.update_active_status()

    def __str__(self):
        return f"{self.phone_number} - {self.role}"
    

    
class TemporaryGroupCreation(models.Model):
    initiator_phone_number = models.CharField(max_length=20, db_index=True)

    group_name = models.CharField(max_length=100)
    quorum = models.PositiveIntegerField()

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    is_cancelled = models.BooleanField(default=False)

    def __str__(self):
        return f"Demande création groupe {self.group_name}"


class TemporaryGroupValidator(models.Model):
    temp_group = models.ForeignKey(
        TemporaryGroupCreation,
        on_delete=models.CASCADE,
        related_name="validators"
    )

    phone_number = models.CharField(max_length=20, db_index=True)
    cin = models.CharField(max_length=20)

    has_accepted = models.BooleanField(null=True)
    rejection_reason = models.TextField(null=True, blank=True)

    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["temp_group", "phone_number"],
                name="unique_temp_validator_phone"
            ),
            models.UniqueConstraint(
                fields=["temp_group", "cin"],
                name="unique_temp_validator_cin"
            ),
        ]

    def __str__(self):
        return f"{self.phone_number} - validation en attente"


class OperationStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"
    CANCELLED = "CANCELLED", "Cancelled"
    COMPLETED = "COMPLETED", "Completed"

class OperationType(models.TextChoices):
    ADD_VALIDATOR = "ADD_VALIDATOR", "Add validator"
    REMOVE_VALIDATOR = "REMOVE_VALIDATOR", "Remove validator"
    DELETE_GROUP = "DELETE_GROUP", "Delete group"

class Operation(models.Model):

    reference = models.CharField(
        max_length=50,
        unique=True,
        db_index=True
    )

    group = models.ForeignKey(
        "groups.ValidationGroup",
        on_delete=models.CASCADE,
        related_name="operations"
    )

    initiator_phone_number = models.CharField(
        max_length=20,
        db_index=True
    )

    operation_type = models.CharField(
        max_length=30,
        choices=OperationType.choices
    )

    status = models.CharField(
        max_length=15,
        choices=OperationStatus.choices,
        default=OperationStatus.PENDING
    )

    payload = models.JSONField(
        null=True,
        blank=True
    )

    completed_at = models.DateTimeField(null=True, blank=True)


    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    resolved_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    
    def mark_completed(self):
        if self.status == OperationStatus.COMPLETED:
            return

        self.status = OperationStatus.COMPLETED
        self.completed_at = timezone.now()
        self.save(update_fields=["status", "completed_at"])

    def mark_rejected(self):
        if self.status == OperationStatus.REJECTED:
            return

        self.status = OperationStatus.REJECTED
        self.resolved_at = timezone.now()
        self.save(update_fields=["status", "resolved_at"])

    def __str__(self):
        return f"{self.operation_type} - {self.reference}"

class ValidationStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    ACCEPTED = "ACCEPTED", "Accepted"
    REJECTED = "REJECTED", "Rejected"

class OperationValidation(models.Model):
    operation = models.ForeignKey(
        Operation,
        on_delete=models.CASCADE,
        related_name="validations"
    )

    validation_reference = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
        null=True,
        blank=True
    )

    validator_phone_number = models.CharField(
        max_length=40,
        db_index=True
    )

    status = models.CharField(
        max_length=50,
        choices=ValidationStatus.choices,
        default=ValidationStatus.PENDING
    )

    rejection_reason = models.TextField(
        null=True,
        blank=True
    )

    has_accepted = models.BooleanField(
        null=True,
        blank=True
    )
    validated_at = models.DateTimeField(
        null=True,
        blank=True
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["operation", "validator_phone_number"],
                name="unique_validator_per_operation"
            )
        ]

    def __str__(self):
        return f"{self.validator_phone_number} → {self.status}"
    
class TemporaryGroupStatus(models.TextChoices):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"

class TemporaryGroupValidatorStatus(models.TextChoices):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class TemporaryAddValidator(models.Model):
    """
    Opération temporaire d’ajout d’un validateur à un groupe existant.
    """

    group = models.ForeignKey(
        "groups.ValidationGroup",
        on_delete=models.CASCADE,
        related_name="pending_validator_additions"
    )

    initiator_phone_number = models.CharField(
        max_length=20,
        db_index=True
    )

    validator_phone_number = models.CharField(
        max_length=20,
        db_index=True
    )

    # validator_cin = models.CharField(
    #     max_length=50
    # )

    # =====================
    # Réponse du validateur
    # =====================
    has_accepted = models.BooleanField(
        null=True,
        blank=True
    )

    rejection_reason = models.TextField(
        null=True,
        blank=True
    )

    responded_at = models.DateTimeField(
        null=True,
        blank=True
    )

    # =====================
    # Cycle de vie
    # =====================
    created_at = models.DateTimeField(
        auto_now_add=True
    )

    expires_at = models.DateTimeField()

    is_cancelled = models.BooleanField(
        default=False
    )

    # =====================
    # Meta
    # =====================
    class Meta:
        db_table = "groups_temp_add_validator"
        indexes = [
            models.Index(
                fields=["validator_phone_number"]
            ),
            models.Index(
                fields=["initiator_phone_number"]
            ),
        ]
        unique_together = (
            "group",
            "validator_phone_number",
            "is_cancelled"
        )

    def __str__(self):
        return (
            f"Ajout validateur {self.validator_phone_number} "
            f"au groupe {self.group.group_name}"
        )

    def has_expired(self) -> bool:
        return self.expires_at < timezone.now()
