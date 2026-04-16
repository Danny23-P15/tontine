from django.db import models
from django.utils import timezone
# from django.db import Q
from core.models import User


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
        
        validators_count = self.memberships.filter(
            role=GroupRole.VALIDATOR,
            left_at__isnull=True
        ).count()

        # le membre initiateur n’est pas comptabilisé dans le quorum
        new_status = validators_count > self.quorum

        # éviter les mises à jour inutiles
        if self.is_active != new_status:
            self.is_active = new_status
            self.save(update_fields=["is_active"])

            # synchronisation des membres actifs
            self.memberships.filter(
                left_at__isnull=True
            ).update(is_active=new_status)
    def mark_as_deleted(self):
        """Marque le groupe comme supprimé (soft delete) et tous les membres comme sortis"""
        # Marquer tous les membres actifs comme ayant quitté
        self.memberships.filter(
            left_at__isnull=True
        ).update(
            left_at=timezone.now(),
            is_active=False
        )
        
        # Marquer le groupe comme supprimé
        self.deleted_at = timezone.now()
        self.is_active = False
        self.save(update_fields=["deleted_at", "is_active"])

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

    def save(self, *args, **kwargs):
        # lorsqu’on crée un membre, on reflète l’état actuel du groupe
        if self._state.adding and self.group_id is not None:
            # récupération différée du groupe si nécessaire
            if hasattr(self, "group"):
                grp = self.group
            else:
                grp = ValidationGroup.objects.get(id=self.group_id)
            self.is_active = grp.is_active
        super().save(*args, **kwargs)

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

            # models.UniqueConstraint(
            #     fields=["owner_user"],
            #     condition=models.Q(owner_type="USER"),
            #     name="unique_user_account"
            # ),
            # models.UniqueConstraint(
            #     fields=["owner_group"],
            #     condition=models.Q(owner_type="GROUP"),
            #     name="unique_group_account"
            # ),
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
    EXPIRED = "EXPIRED", "Expired"

class OperationType(models.TextChoices):
    ADD_VALIDATOR = "ADD_VALIDATOR", "Add validator"
    REMOVE_VALIDATOR = "REMOVE_VALIDATOR", "Remove validator"
    DELETE_GROUP = "DELETE_GROUP", "Delete group"
    TRANSACTION = "TRANSACTION", "Transaction"

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
    
    def check_and_expire(self):
        """Check if operation has expired and update status if needed."""
        if (self.status in [OperationStatus.PENDING, OperationStatus.APPROVED] and 
            self.expires_at <= timezone.now()):
            self.status = OperationStatus.EXPIRED
            self.save(update_fields=["status"])
            return True
        return False
    
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


class Account(models.Model):
    owner_type = models.CharField(
        max_length=20, 
        choices=[("USER", "User"), ("GROUP", "Group")]
    )
    owner_user = models.ForeignKey("core.User", null=True, blank=True, on_delete=models.CASCADE)
    owner_phone_number = models.CharField(max_length=20, null=True, blank=True)
    owner_group = models.ForeignKey("ValidationGroup", null=True, blank=True, on_delete=models.CASCADE)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)

class Transaction(models.Model):
    operation = models.OneToOneField(
        Operation,
        on_delete=models.CASCADE,
        related_name="transaction"
    )

    reference = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True
    )

    recipient_phone_number = models.CharField(max_length=20)
    reason = models.TextField(null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)

    executed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    debited_account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        null=True,
        blank=True
    )

    credited_account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name="credit_transactions",
        null=True,
        blank=True
    )


class TemporaryAddValidator(models.Model):

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

# //Transaction