from groups.models import Operation, OperationStatus, OperationValidation, ValidationStatus
from notifications.constants import OperationEvent
from notifications.services.operation_notifications import notify_operation_status
from audit.models import AdminActionLog
from django.utils import timezone
from groups.services.operation_validation import execute_operation
from django.db import transaction

def override_operation(*, operation: Operation, admin_user, decision):
    if operation.status != OperationStatus.PENDING:
        return False, "Only pending operations can be overridden."
    
    try:
        if decision == "accept":
            # Exécuter les actions métier pour l'opération
            execute_operation(operation)
            operation.status = OperationStatus.COMPLETED
        elif decision == "refuse":
            operation.status = OperationStatus.REJECTED
        else:
            return False, "Invalid decision. Must be 'accept' or 'refuse'."
        
        operation.completed_at = timezone.now()
        operation.save()
        
        # Log the admin action
        AdminActionLog.objects.create(
            admin=admin_user,
            action="OVERRIDE_OPERATION",
            operation=operation,
            decision=decision
        )
        
        return True, "Operation overridden successfully."
    except Exception as e:
        return False, f"Error processing operation: {str(e)}"

@transaction.atomic
def substitute_validator_response(
    *,
    operation,
    validator_phone_number,
    admin_user,
    decision,
    rejection_reason=None
):
    if operation.status != "PENDING":
        return False, "Only pending operations can be modified."

    try:
        validation = OperationValidation.objects.get(
            operation=operation,
            validator_phone_number=validator_phone_number
        )

        if validation.status != ValidationStatus.PENDING:
            return False, "Validator already responded."

        decision = decision.upper()

        if decision == "ACCEPT":
            validation.status = ValidationStatus.ACCEPTED
            validation.has_accepted = True

        elif decision == "REFUSE":
            validation.status = ValidationStatus.REJECTED
            validation.has_accepted = False
            validation.rejection_reason = rejection_reason

        else:
            return False, "Invalid decision."

        validation.validated_at = timezone.now()
        validation.save()

        # log admin
        AdminActionLog.objects.create(
            admin=admin_user,
            action="ADMIN_SUBSTITUTE_VALIDATOR",
            operation=operation,
            decision=decision
        )

        # Vérifier le quorum
        accepted_count = OperationValidation.objects.filter(
            operation=operation,
            status=ValidationStatus.ACCEPTED
        ).count()
        
        group = operation.group
        quorum = group.quorum
        
        # Si le quorum est atteint, exécuter l'opération
        if accepted_count >= quorum:
            try:
                execute_operation(operation)
                operation.status = OperationStatus.COMPLETED
                operation.completed_at = timezone.now()
                operation.save()
                return True, "Validator response substituted successfully. Operation executed."
            except Exception as e:
                return False, f"Error executing operation: {str(e)}"
        
        return True, "Validator response substituted successfully."

    except OperationValidation.DoesNotExist:
        return False, "Validation record not found."