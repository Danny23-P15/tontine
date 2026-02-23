from django.utils import timezone
from notifications.services.operation_notifications import notify_operation_status
from notifications.constants import OperationEvent


from groups.models import (
    Operation,
    OperationValidation,
    OperationStatus,
    ValidationStatus,
    GroupMembership,
    GroupRole,
    OperationType
)

def respond_to_operation_validation(
    validation_reference: str,
    validator_phone: str,
    accept: bool,
    rejection_reason: str | None = None
):
    try:
        validation = OperationValidation.objects.select_related(
            "operation", "operation__group"
        ).get(
            validation_reference=validation_reference,
            validator_phone_number=validator_phone
        )
    except OperationValidation.DoesNotExist:
        return False, "Validation introuvable"

    operation = validation.operation
    group = operation.group

    # opération encore active ?
    if operation.status != OperationStatus.PENDING:
        return False, "Cette opération n’est plus active"

    # expiration
    if operation.expires_at and timezone.now() > operation.expires_at:
        operation.status = OperationStatus.CANCELLED
        operation.resolved_at = timezone.now()
        operation.save(update_fields=["status", "resolved_at"])
        return False, "L’opération a expiré"

    # pas de double validation
    if validation.status != ValidationStatus.PENDING:
        return False, "Vous avez déjà répondu à cette opération"

    # enregistrer la réponse
    validation.status = (
        ValidationStatus.ACCEPTED if accept else ValidationStatus.REJECTED
    )
    validation.rejection_reason = rejection_reason if not accept else None
    validation.validated_at = timezone.now()
    validation.save()

    validations = operation.validations.all()
    approved = validations.filter(status=ValidationStatus.ACCEPTED).count()
    rejected = validations.filter(status=ValidationStatus.REJECTED).count()
    total = validations.count()

    # quorum devenu impossible
    if total - rejected < group.quorum:
        operation.status = OperationStatus.REJECTED
        operation.resolved_at = timezone.now()
        operation.save(update_fields=["status", "resolved_at"])

        event = (
            OperationEvent.ADD_VALIDATOR_REJECTED
            if operation.operation_type == OperationType.ADD_VALIDATOR
            else OperationEvent.REMOVE_VALIDATOR_REJECTED
        )

        notify_operation_status(operation=operation, event=event)
        return True, "L’opération a été rejetée"

    # quorum atteint
    if approved >= group.quorum:
        execute_operation(operation)

        operation.status = OperationStatus.APPROVED
        operation.resolved_at = timezone.now()
        operation.save(update_fields=["status", "resolved_at"])

        event = (
            OperationEvent.VALIDATOR_ADDED
            if operation.operation_type == OperationType.ADD_VALIDATOR
            else OperationEvent.VALIDATOR_REMOVED
        )


        notify_operation_status(operation=operation, event=event)
        return True, "L’opération a été validée et exécutée"

    # quorum pas encore atteint → notification individuelle
    notify_operation_status(
        operation=operation,
        event=OperationEvent.VALIDATION_RECORDED,
        actor_phone=validator_phone
    )

    return True, "Votre validation a été enregistrée"


def respond_to_add_validator_request(
    *,
    operation: Operation,
    validator_phone: str,
    accept: bool,
    rejection_reason: str | None = None
) -> tuple[bool, str]:

    if operation.operation_type != OperationType.ADD_VALIDATOR:
        return False, "Opération invalide"

    if operation.expires_at < timezone.now():
        return False, "Cette demande a expiré"

    try:
        validation = OperationValidation.objects.get(
            operation=operation,
            validator_phone_number=validator_phone
        )
    except OperationValidation.DoesNotExist:
        return False, "Vous n’êtes pas autorisé à répondre"

    if validation.status != ValidationStatus.PENDING:
        return False, "Vous avez déjà répondu"

    # 📝 Enregistrement réponse
    validation.status = (
        ValidationStatus.ACCEPTED if accept else ValidationStatus.REJECTED
    )
    validation.rejection_reason = rejection_reason if not accept else None
    validation.validated_at = timezone.now()
    validation.save()

    # Si refus immédiat
    if not accept:
        operation.mark_rejected()
        notify_operation_status(
            source=operation.group,
            event=OperationEvent.ADD_VALIDATOR_REJECTED,
            actor_phone=validator_phone
        )
        return True, "Demande de validateur refusée"

    # 📊 Calcul du quorum
    accepted_count = operation.validations.filter(
        status=ValidationStatus.ACCEPTED
    ).count()

    quorum = operation.group.quorum

    # ⏳ quorum pas encore atteint
    if accepted_count < quorum:
        notify_operation_status(
            source=operation,
            event=OperationEvent.VALIDATION_RECORDED,
            actor_phone=validator_phone
        )
        return True, "Votre réponse a été enregistrée"

    # ✅ quorum atteint → ajout du validateur
    payload = operation.payload
    validator_phone_to_add = payload["validator_phone_number"]
    cin = payload["cin"]

    GroupMembership.objects.create(
        group=operation.group,
        phone_number=validator_phone_to_add,
        cin=cin,
        role=GroupRole.VALIDATOR
    )

    operation.mark_completed()

    notify_operation_status(
    source=operation.group,
    event=OperationEvent.VALIDATOR_ADDED,
    actor_phone=validator_phone_to_add,
    # extra_context={
    #     "validator_phone": validator_phone,
    #     "group_name": operation.group.group_name
    # }
)


    return True, "Le validateur a été ajouté au groupe (Quorum atteint)"

def execute_add_validator(operation: Operation):
    data = operation.payload
    group = operation.group

    GroupMembership.objects.create(
        group=group,
        phone_number=data["validator_phone_number"],
        cin=data["cin"],
        role=GroupRole.VALIDATOR
    )

    group.update_active_status()

def respond_to_remove_validator_request(
    *,
    operation: Operation,
    validator_phone: str,
    accept: bool,
    rejection_reason: str | None = None
) -> tuple[bool, str]:

    if operation.operation_type != OperationType.REMOVE_VALIDATOR:
        return False, "Opération invalide"

    if operation.expires_at < timezone.now():
        return False, "Cette demande a expiré"

    try:
        validation = OperationValidation.objects.get(
            operation=operation,
            validator_phone_number=validator_phone
        )
    except OperationValidation.DoesNotExist:
        return False, "Vous n’êtes pas autorisé à répondre"

    if validation.status != ValidationStatus.PENDING:
        return False, "Vous avez déjà répondu"

    # 📝 Enregistrement réponse
    validation.status = (
        ValidationStatus.ACCEPTED if accept else ValidationStatus.REJECTED
    )
    validation.rejection_reason = rejection_reason if not accept else None
    validation.validated_at = timezone.now()
    validation.save()

    # ❌ Si un validateur refuse → opération rejetée immédiatement
    if not accept:
        operation.mark_rejected()

        notify_operation_status(
            source=operation.group,
            event=OperationEvent.REMOVE_VALIDATOR_REJECTED,
            actor_phone=validator_phone
        )

        return True, "Suppression refusée"

    # 📊 Calcul quorum
    accepted_count = operation.validations.filter(
        status=ValidationStatus.ACCEPTED
    ).count()

    quorum = operation.group.quorum

    # ⏳ quorum pas encore atteint
    if accepted_count < quorum:
        notify_operation_status(
            source=operation,
            event=OperationEvent.VALIDATION_RECORDED,
            actor_phone=validator_phone
        )
        return True, "Votre réponse a été enregistrée"

    # ✅ quorum atteint → suppression effective
    payload = operation.payload
    phone_to_remove = payload["validator_phone_number"]

    try:
        membership = GroupMembership.objects.get(
            group=operation.group,
            phone_number=phone_to_remove,
            role=GroupRole.VALIDATOR,
            left_at__isnull=True
        )
    except GroupMembership.DoesNotExist:
        return False, "Le validateur n’existe plus"

    membership.left_at = timezone.now()
    membership.save()

    operation.mark_completed()

    notify_operation_status(
        source=operation.group,
        event=OperationEvent.VALIDATOR_REMOVED,
        actor_phone=phone_to_remove
    )

    return True, "Le validateur a été supprimé du groupe (Quorum atteint)"

def respond_to_group_deletion(operation: Operation):
    group = operation.group
    validations = operation.validations.all()

    # ❌ un seul refus = rejet définitif
    if validations.filter(status=OperationStatus.REJECTED).exists():
        operation.status = OperationStatus.REJECTED
        operation.resolved_at = timezone.now()
        operation.save(update_fields=["status", "resolved_at"])

        notify_operation_status(
            source=operation,
            event=OperationEvent.GROUP_DELETION_REJECTED
        )
        return

    # ⏳ validations en attente
    if validations.filter(status=OperationStatus.PENDING).exists():
        return

    # ✅ unanimité atteinte
    group.deleted_at = timezone.now()
    group.is_active = False
    group.save(update_fields=["deleted_at", "is_active"])

    GroupMembership.objects.filter(
        group=group,
        left_at__isnull=True
    ).update(
        left_at=timezone.now(),
        is_active=False
    )

    operation.status = OperationStatus.APPROVED
    operation.resolved_at = timezone.now()
    operation.save(update_fields=["status", "resolved_at"])

    notify_operation_status(
        source=operation,
        event=OperationEvent.GROUP_DELETED
    )

def respond_to_delete_group_request(
    *,
    operation: Operation,
    validator_phone: str,
    accept: bool,
    rejection_reason: str | None = None
):

    try:
        ov = OperationValidation.objects.get(
            operation=operation,
            validator_phone_number=validator_phone
        )
    except OperationValidation.DoesNotExist:
        return False, "Vous n’êtes pas autorisé à répondre"

    if ov.status != ValidationStatus.PENDING:
        return False, "Vous avez déjà répondu"

    ov.status = (
        ValidationStatus.ACCEPTED
        if accept
        else ValidationStatus.REJECTED
    )
    ov.rejection_reason = rejection_reason if not accept else None
    ov.validated_at = timezone.now()
    ov.save()

    # ❌ Un seul refus = rejet total
    if not accept:
        operation.status = OperationStatus.REJECTED
        operation.save()

        notify_operation_status(
            source=operation,
            event=OperationEvent.DELETE_GROUP_REJECTED,
            actor_phone=validator_phone
        )

        return True, "Suppression refusée"

    # Vérification unanimité
    total = operation.validations.count()
    accepted = operation.validations.filter(
        status=ValidationStatus.ACCEPTED
    ).count()

    if accepted < total:
        notify_operation_status(
            source=operation,
            event=OperationEvent.VALIDATION_RECORDED,
            actor_phone=validator_phone
        )
        return True, "Validation enregistrée"

    # ✅ Tous acceptés → suppression réelle
    group = operation.group

    group.is_active = False
    group.deleted_at = timezone.now()
    group.save()

    operation.status = OperationStatus.COMPLETED
    operation.save()

    notify_operation_status(
        source=operation,
        event=OperationEvent.DELETE_GROUP_COMPLETED
    )

    return True, "Le groupe a été supprimé"

def execute_remove_validator(operation: Operation) -> None:
    validator_phone = operation.payload["validator_phone_to_remove"]

    GroupMembership.objects.filter(
        group=operation.group,
        phone_number=validator_phone,
        left_at__isnull=True
    ).update(
        left_at=timezone.now(),
        is_active=False
    )

    operation.group.update_active_status()


def execute_group_deletion(operation: Operation) -> None:

    group = operation.group

    group.deleted_at = timezone.now()
    group.is_active = False
    group.save(update_fields=["deleted_at", "is_active"])

    GroupMembership.objects.filter(
        group=group,
        left_at__isnull=True
    ).update(
        left_at=timezone.now(),
        is_active=False
    )

    operation.status = OperationStatus.COMPLETED
    operation.completed_at = timezone.now()
    operation.save(update_fields=["status", "completed_at"])

    notify_operation_status(
        source=operation,
        event=OperationEvent.GROUP_DELETED
    )


# def execute_delete_group()

def execute_operation(operation: Operation):
    if operation.operation_type == OperationType.ADD_VALIDATOR:
        execute_add_validator(operation)

    elif operation.operation_type == OperationType.REMOVE_VALIDATOR:
        execute_remove_validator(operation)

    elif operation.operation_type == OperationType.DELETE_GROUP:
        
        execute_group_deletion(operation)

    
