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
        ValidationStatus.APPROVED if accept else ValidationStatus.REJECTED
    )
    validation.rejection_reason = rejection_reason if not accept else None
    validation.validated_at = timezone.now()
    validation.save()

    validations = operation.validations.all()
    approved = validations.filter(status=ValidationStatus.APPROVED).count()
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

# def execute_delete_group()

def execute_operation(operation: Operation):
    if operation.operation_type == OperationType.ADD_VALIDATOR:
        execute_add_validator(operation)

    elif operation.operation_type == OperationType.REMOVE_VALIDATOR:
        execute_remove_validator(operation)

    
