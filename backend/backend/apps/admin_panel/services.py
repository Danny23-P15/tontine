from groups.models import Operation, OperationStatus
from notifications.constants import OperationEvent
from notifications.services.operation_notifications import notify_operation_status
from audit.models import AdminActionLog
from django.utils import timezone
from groups.services.operation_validation import execute_operation

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
            admin_user=admin_user,
            action="OVERRIDE_OPERATION",
            target_id=operation.id
        )
        
        return True, "Operation overridden successfully."
    except Exception as e:
        return False, f"Error processing operation: {str(e)}"
