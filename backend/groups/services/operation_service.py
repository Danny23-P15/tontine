# groups/services/operation_service.py

from datetime import timedelta
from django.utils import timezone
from django.db import transaction
from datetime import timedelta
from groups.services.group_rules import can_remove_validator
from groups.models import Operation, OperationType, OperationStatus, GroupMembership, GroupRole, OperationValidation, ValidationStatus
from django.utils import timezone
import uuid
from notifications.services.operation_notifications import notify_operation_status
from notifications.constants import OperationEvent


from groups.models import (
    ValidationGroup,
    GroupMembership,
    GroupRole,
    Operation,
    OperationValidation,
    OperationType,
    OperationStatus,
    OperationValidation,
    TemporaryAddValidator

)
from groups.utils import generate_reference  # on va la créer juste après
from groups.services.group_rules import can_add_validator, can_remove_validator
from groups.services.group_rules import can_delete_group

import uuid


def create_operation(
    group: ValidationGroup,
    initiator_phone: str,
    operation_type: str,
    payload: dict | None = None
) -> tuple[bool, str | None, Operation | None]:

    # 1️⃣ vérifier que le groupe est actif
    if not group.is_active:
        return False, "Le groupe n’est pas actif", None

    # 2️⃣ vérifier que l’initiateur appartient au groupe
    try:
        initiator_membership = GroupMembership.objects.get(
            group=group,
            phone_number=initiator_phone,
            left_at__isnull=True
        )
    except GroupMembership.DoesNotExist:
        return False, "Vous n’appartenez pas à ce groupe", None

    # 3️⃣ récupérer les validateurs actifs (sans l’initiateur)
    validators = GroupMembership.objects.filter(
        group=group,
        role=GroupRole.VALIDATOR,
        is_active=True,
        left_at__isnull=True
    )

    if not validators.exists():
        return False, "Aucun validateur actif dans ce groupe", None

    expires_at = timezone.now() + timedelta(hours=48)

    # 4️⃣ création atomique
    with transaction.atomic():

        operation = Operation.objects.create(
            group=group,
            initiator_phone_number=initiator_phone,
            operation_type=operation_type,
            payload=payload,
            expires_at=expires_at,
            reference=generate_reference(prefix="OP")
        )

        # 5️⃣ créer les validations
        for validator in validators:
            OperationValidation.objects.create(
                operation=operation,
                validator_phone_number=validator.phone_number,
                validation_reference=generate_reference(prefix="VAL")
            )

    return True, None, operation


def request_add_validator(
    *,
    group: ValidationGroup,
    initiator_phone: str,
    validator_phone: str,
    validator_cin: str
) -> tuple[bool, str | None]:

    if group.initiator_phone_number != initiator_phone:
        return False, "Seul l’initiateur peut ajouter un validateur"

    if not group.is_active:
        return False, "Le groupe n’est pas actif"

    allowed, reason = can_add_validator(
        group=group,
        initiator_phone=initiator_phone,
        validator_phone=validator_phone,
        validator_cin=validator_cin
    )
    if not allowed:
        return False, reason

    with transaction.atomic():

        operation = Operation.objects.create(
            group=group,
            initiator_phone_number=initiator_phone,
            operation_type=OperationType.ADD_VALIDATOR,
            reference=f"OP-ADD-{uuid.uuid4().hex[:8]}",
            payload={
                "validator_phone_number": validator_phone,
                "cin": validator_cin
            },
            status=OperationStatus.PENDING,
            expires_at=timezone.now() + timedelta(hours=48)
        )

        validators = group.memberships.filter(
            role=GroupRole.VALIDATOR,
            left_at__isnull=True
        )

        OperationValidation.objects.bulk_create([
            OperationValidation(
                operation=operation,
                validator_phone_number=v.phone_number,
                validation_reference=f"VAL-{uuid.uuid4().hex[:8]}",
                status=ValidationStatus.PENDING
            )
            for v in validators
        ])

    # 🔔 NOTIFICATION DES VALIDATEURS ACTUELS
    notify_operation_status(
        source=operation,
        event=OperationEvent.ADD_VALIDATOR_REQUESTED,
        actor_phone=initiator_phone
    )

    return True, "Demande d’ajout de validateur envoyée"


def request_remove_validator(
    *,
    group: ValidationGroup,
    initiator_phone: str,
    validator_phone: str,
) -> tuple[bool, str | None]:

    # 🔒 Seul l’initiateur
    if group.initiator_phone_number != initiator_phone:
        return False, "Seul l’initiateur peut supprimer un validateur"

    if not group.is_active:
        return False, "Le groupe n’est pas actif"

    # ✅ Règle métier dédiée
    allowed, reason = can_remove_validator(
        group=group,
        # initiator_phone=initiator_phone,
        validator_phone_to_remove=validator_phone,
    )
    if not allowed:
        return False, reason

    with transaction.atomic():

        operation = Operation.objects.create(
            group=group,
            initiator_phone_number=initiator_phone,
            operation_type=OperationType.REMOVE_VALIDATOR,
            reference=f"OP-REM-{uuid.uuid4().hex[:8]}",
            payload={
                "validator_phone_number": validator_phone,
            },
            status=OperationStatus.PENDING,
            expires_at=timezone.now() + timezone.timedelta(hours=48)
        )

        validators = group.memberships.filter(
            role=GroupRole.VALIDATOR,
            left_at__isnull=True
        )

        OperationValidation.objects.bulk_create([
            OperationValidation(
                operation=operation,
                validator_phone_number=v.phone_number,
                validation_reference=f"VAL-{uuid.uuid4().hex[:8]}",
                status=OperationStatus.PENDING
            )
            for v in validators
        ])

        # 🔔 Notification
        notify_operation_status(
            source=operation,
            event=OperationEvent.REMOVE_VALIDATOR_REQUESTED,
            actor_phone=initiator_phone
        )

    return True, "Demande de suppression de validateur envoyée"


def create_remove_validator_operation(
    *,
    group,
    initiator_phone: str,
    validator_phone_to_remove: str
) -> tuple[bool, str]:
    
    if group.initiator_phone_number != initiator_phone:
        return False,

    # 1️⃣ règle métier
    allowed, reason = can_remove_validator(
        group=group,
        validator_phone_to_remove=validator_phone_to_remove
    )
    if not allowed:
        return False, reason

    # 2️⃣ créer l’opération
    operation = Operation.objects.create(
        group=group,
        initiator_phone_number=initiator_phone,
        operation_type=OperationType.REMOVE_VALIDATOR,
        reference=f"RM-GR-{uuid.uuid4().hex[:8]}",

        payload={
            "validator_phone_to_remove": validator_phone_to_remove
        },
        expires_at=timezone.now() + timedelta(hours=48)
    )

    # 3️⃣ récupérer les validateurs concernés
    validators = GroupMembership.objects.filter(
        group=group,
        role=GroupRole.VALIDATOR,
        left_at__isnull=True
    ).exclude(phone_number=initiator_phone)

    # 4️⃣ créer les validations
    OperationValidation.objects.bulk_create([
        OperationValidation(
            operation=operation,
            validation_reference=str(uuid.uuid4()),
            validator_phone_number=v.phone_number
        )
        for v in validators
    ])

    return True, "Demande de suppression envoyée aux validateurs"


def create_delete_group_operation(
    group,
    initiator_phone: str
):
    # 1️⃣ règle : seul l’initiateur
    if group.initiator_phone_number != initiator_phone:
        return False, "Seul l’initiateur peut supprimer le groupe"

    # 2️⃣ vérifier qu’il n’y a pas déjà une suppression en cours
    if group.operations.filter(
        operation_type=OperationType.DELETE_GROUP,
        status=OperationStatus.PENDING
    ).exists():
        return False, "Une demande de suppression est déjà en cours"

    # 3️⃣ créer l’opération
    operation = Operation.objects.create(
        group=group,
        initiator_phone_number=initiator_phone,
        operation_type=OperationType.DELETE_GROUP,
        reference=f"OP-DEL-{uuid.uuid4().hex[:8]}",
        expires_at=timezone.now() + timezone.timedelta(hours=48)
    )

    # créer les validations (TOUS les validateurs)
    validators = GroupMembership.objects.filter(
        group=group,
        role=GroupRole.VALIDATOR,
        left_at__isnull=True
    )

    for v in validators:
        operation.validations.create(
            validator_phone_number=v.phone_number,
            validation_reference=f"VAL-{uuid.uuid4().hex[:8]}"
        )

    return True, operation


def request_delete_group(*, group: ValidationGroup, initiator_phone: str):

    # 1️⃣ Vérifier initiateur
    if group.initiator_phone_number != initiator_phone:
        return False, "Seul l’initiateur peut supprimer le groupe"

    # 2️⃣ Vérifier groupe actif
    if not group.is_active:
        return False, "Le groupe est déjà inactif"

    # 3️⃣ Empêcher si opération en cours
    pending_exists = Operation.objects.filter(
        group=group,
        status=OperationStatus.PENDING
    ).exists()

    if pending_exists:
        return False, "Une opération est déjà en cours sur ce groupe"

    # 4️⃣ Créer l’opération
    operation = Operation.objects.create(
        group=group,
        operation_type=OperationType.DELETE_GROUP,
        initiator_phone_number=initiator_phone,
        payload={},
        status=OperationStatus.PENDING,
        # ajouter une référence unique comme les autres opérations
        reference=generate_reference(prefix="OP-DEL"),
        expires_at=timezone.now() + timedelta(hours=24)
    )

    # 5️⃣ Créer validations
    validators = GroupMembership.objects.filter(
        group=group,
        role=GroupRole.VALIDATOR,
        left_at__isnull=True
    )

    for v in validators:
        OperationValidation.objects.create(
            operation=operation,
            validator_phone_number=v.phone_number,
            validation_reference=f"VAL-{uuid.uuid4().hex[:8]}"
        )

    # 6️⃣ Notifier
    notify_operation_status(
        source=operation,
        event=OperationEvent.DELETE_GROUP_REQUESTED
    )

    return True, "Demande de suppression envoyée"


def cancel_operation(operation: Operation, user_phone: str) -> tuple[bool, str | None]:

    if operation.initiator_phone_number != user_phone:
        return False, "Vous ne pouvez pas annuler cette opération"

    if operation.status != OperationStatus.PENDING:
        return False, "Seules les opérations en attente peuvent être annulées"

    if operation.expires_at and operation.expires_at < timezone.now():
        return False, "Cette opération est déjà expirée"

    with transaction.atomic():

        operation.status = OperationStatus.CANCELLED
        operation.resolved_at = timezone.now()
        operation.save(update_fields=["status", "resolved_at"])

        operation.validations.update(
            status=OperationStatus.CANCELLED
        )

        # notify_operation_status(
        #     source=operation,
        #     event=OperationEvent.OPERATION_CANCELLED,
        #     actor_phone=user_phone
        # )

    return True, "Opération annulée avec succès"