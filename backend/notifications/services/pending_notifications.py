from django.utils import timezone


from groups.models import (
    TemporaryGroupCreation,
    TemporaryGroupValidator,
    TemporaryAddValidator,
    GroupRole,
    OperationValidation,
    Operation,
    OperationType,
    ValidationStatus,
    OperationStatus
)
from core.models import User
from notifications.constants import OperationEvent
from notifications.models import Notification


def get_pending_notifications(user):
    """
    Retourne toutes les notifications actionnables
    pour l'utilisateur connecté.
    """
        
    phone_number = user.phone_number
    now = timezone.now()

    results = []

    # 1️⃣ Création de groupe (TEMP)

    temp_validations = TemporaryGroupValidator.objects.select_related(
        "temp_group"
    ).filter(
        phone_number=phone_number,
        has_accepted__isnull=True,
        temp_group__is_cancelled=False,
        temp_group__expires_at__gt=now
    )
# payload
    for validator in temp_validations:
        temp_group = validator.temp_group

        accepted_count = temp_group.validators.filter(
            has_accepted=True
        ).count()

        results.append({
            "id": f"temp-group-{temp_group.id}-to-{validator.phone_number}",
            "type": "GROUP_CREATION_REQUEST",
            "event": OperationEvent.GROUP_CREATION_REQUEST.value,
            "title": "Création de groupe en attente",
            "message": (
                f"L'utilisateur {temp_group.initiator_phone_number} vous demande d'être un des validateurs du groupe qu'il a créé. "
                f"Nom du groupe: « {temp_group.group_name} » "
                f"quorum: {temp_group.quorum}"
            ),
            "created_at": temp_group.created_at,
            "initiator_phone": temp_group.initiator_phone_number,
            "quorum": temp_group.quorum,

            "action": {
                "endpoint": "/api/groups/creation/respond/",
                "method": "POST",
                "payload": {
                    "temp_group_id": temp_group.id
                }
            },

            "context": {
                "group_name": temp_group.group_name,
                "initiator_phone": temp_group.initiator_phone_number,
                "validators_required": temp_group.validators.count(),
                "validators_accepted": accepted_count
            }
        })

# 2️⃣ Ajout de validateur (TEMP ADD)

# 2️⃣ Ajout de validateur (OPERATION)

    pending_ops = OperationValidation.objects.select_related(
        "operation",
        "operation__group"
    ).filter(
        validator_phone_number=phone_number,
        status=ValidationStatus.PENDING,
        operation__operation_type=OperationType.ADD_VALIDATOR,
        operation__status=OperationStatus.PENDING,
        operation__expires_at__gt=now
    )

    for ov in pending_ops:
        operation = ov.operation
        group = operation.group

        accepted_count = OperationValidation.objects.filter(
            operation=operation,
            status=ValidationStatus.ACCEPTED
        ).count()

        results.append({
            "id": f"add-validator-op-{operation.id}",
            "type": "ADD_VALIDATOR_REQUEST",
            "event": OperationEvent.ADD_VALIDATOR_REQUESTED.value,
            "title": "Ajout de validateur",
            "message": (
                f"L’initiateur {operation.initiator_phone_number} "
                f"souhaite ajouter {operation.payload.get('validator_phone_number')} "
                f"au groupe « {group.group_name} »."
            ),
            "created_at": operation.created_at,

            # ✅ ACTION SPÉCIFIQUE AU VALIDATEUR
            "action": {
                "endpoint": "/api/operations/respond/",
                "method": "POST",
                "payload": {
                    "operation_id": operation.id,
                    "reference": operation.reference
                }
            },

            "context": {
                "group_name": group.group_name,
                "initiator_phone": operation.initiator_phone_number,
                "validator_to_add": operation.payload.get("validator_phone_number"),
                "validators_required": group.quorum,
                "validators_accepted": accepted_count
            }
        })

        # ===============================
        # (EXTENSION FUTURE)
        # Opérations sur groupes existants
        # ===============================
        # 👉 ADD_VALIDATOR / REMOVE_VALIDATOR / FINANCE
        # même shape, autre "type"
        # 3️⃣ Suppression de validateur (OPERATION)

    pending_remove_ops = OperationValidation.objects.select_related(
        "operation",
        "operation__group"
    ).filter(
        validator_phone_number=phone_number,
        status=ValidationStatus.PENDING,
        operation__operation_type=OperationType.REMOVE_VALIDATOR,
        operation__status=OperationStatus.PENDING,
        operation__expires_at__gt=now
    )   
        
    for ov in pending_remove_ops:
        operation = ov.operation
        group = operation.group
        accepted_count = OperationValidation.objects.filter(
            operation=operation,
            status=ValidationStatus.ACCEPTED
        ).count()

        results.append({
            "id": f"remove-validator-op-{operation.id}",
            "type": "REMOVE_VALIDATOR_REQUEST",
            "event": OperationEvent.REMOVE_VALIDATOR_REQUESTED.value,
            "title": "Suppression de validateur",
            "message": (
                f"L’initiateur {operation.initiator_phone_number} "
                f"souhaite supprimer {operation.payload.get('validator_phone_number')} "
                f"du groupe « {group.group_name} »."
            ),
            "created_at": operation.created_at,

            "action": {
                "endpoint": "/api/operations/respond/",
                "method": "POST",
                "payload": {
                    "operation_id": operation.id
                }
            },

            "context": {
                "group_name": group.group_name,
                "initiator_phone": operation.initiator_phone_number,
                "validator_to_remove": operation.payload.get("validator_phone_number"),
                "validators_required": group.quorum,
                "validators_accepted": accepted_count
            }
        })

        # ov

# 4️⃣ Suppression de groupe (OPERATION)

    pending_delete_ops = OperationValidation.objects.select_related(
        "operation",
        "operation__group"
    ).filter(
        validator_phone_number=phone_number,
        status=ValidationStatus.PENDING,
        operation__operation_type=OperationType.DELETE_GROUP,
        operation__status=OperationStatus.PENDING,
        operation__expires_at__gt=now
    )

    for ov in pending_delete_ops:
        operation = ov.operation
        group = operation.group

        accepted_count = OperationValidation.objects.filter(
            operation=operation,
            status=ValidationStatus.ACCEPTED
        ).count()

        results.append({
            "id": f"delete-group-op-{operation.id}",
            "type": "DELETE_GROUP_REQUEST",
            "event": OperationEvent.DELETE_GROUP_REQUESTED.value,
            "title": "Suppression du groupe",
            "message": (
                f"L’initiateur {operation.initiator_phone_number} "
                f"souhaite supprimer le groupe « {group.group_name} »."
            ),
            "created_at": operation.created_at,

            "action": {
                "endpoint": "/api/operations/respond/",
                "method": "POST",
                "payload": {
                    "operation_id": operation.id
                }
            },

            "context": {
                "group_name": group.group_name,
                "initiator_phone": operation.initiator_phone_number,
                "validators_required": group.quorum,
                "validators_accepted": accepted_count
            }
        })

    # 5️⃣ Transactions (OPERATION)

    pending_transaction_ops = OperationValidation.objects.select_related(
        "operation",
        "operation__group"
    ).filter(
        validator_phone_number=phone_number,
        status=ValidationStatus.PENDING,
        operation__operation_type=OperationType.TRANSACTION,
        operation__status=OperationStatus.PENDING,
        operation__expires_at__gt=now
    )

    for ov in pending_transaction_ops:
        operation = ov.operation
        group = operation.group

        accepted_count = OperationValidation.objects.filter(
            operation=operation,
            status=ValidationStatus.ACCEPTED
        ).count()

        amount = operation.payload.get("amount", "N/A")
        recipient = operation.payload.get("recipient_phone_number", "N/A")

        results.append({
            "id": f"transaction-op-{operation.id}",
            "type": "TRANSACTION_REQUEST",
            "event": OperationEvent.TRANSACTION_REQUESTED.value,
            "title": "Demande de transaction",
            "message": (
                f"L'initiateur {operation.initiator_phone_number} "
                f"souhaite transférer {amount} Ar vers {recipient} "
                f"du groupe « {group.group_name} »."
            ),
            "created_at": operation.created_at,

            "action": {
                "endpoint": "/api/operations/respond/",
                "method": "POST",
                "payload": {
                    "operation_id": operation.id
                }
            },

            "context": {
                "group_name": group.group_name,
                "initiator_phone": operation.initiator_phone_number,
                "amount": amount,
                "recipient_phone": recipient,
                "validators_required": group.quorum,
                "validators_accepted": accepted_count
            }
        })

    return {
        "count": len(results),
        "results": results
    }



def get_pending_notification_detail(user, request_id):
    phone_number = user.phone_number
    now = timezone.now()
    temp_group_prefix = "temp-group-"

    if request_id.startswith(temp_group_prefix):
        identifier, separator, recipient_phone = request_id[
            len(temp_group_prefix):
        ].partition("-to-")
        if not separator or recipient_phone != phone_number:
            return None

        try:
            temp_group_id = int(identifier)
        except ValueError:
            return None

        validator = TemporaryGroupValidator.objects.select_related(
            "temp_group"
        ).filter(
            temp_group_id=temp_group_id,
            phone_number=phone_number,
            has_accepted__isnull=True,
            temp_group__is_cancelled=False,
            temp_group__expires_at__gt=now
        ).first()
        if validator is None:
            return None

        temp_group = validator.temp_group
        accepted_count = temp_group.validators.filter(has_accepted=True).count()
        initiator = User.objects.filter(
            phone_number=temp_group.initiator_phone_number
        ).values("phone_number", "full_name").first()

        return {
            "id": request_id,
            "request_type": "GROUP_CREATION_REQUEST",
            "operation_type": "GROUP_CREATION",
            "operation_type_display": "Création de groupe",
            "group": {"id": None, "name": temp_group.group_name},
            "initiator": initiator or {
                "phone_number": temp_group.initiator_phone_number,
                "full_name": None
            },
            "initiated_at": temp_group.created_at,
            "expires_at": temp_group.expires_at,
            "status": "PENDING",
            "details": {
                "quorum": temp_group.quorum,
                "validators_required": temp_group.validators.count(),
                "validators_accepted": accepted_count
            }
        }

    operation_prefixes = {
        "add-validator-op-": OperationType.ADD_VALIDATOR,
        "remove-validator-op-": OperationType.REMOVE_VALIDATOR,
        "delete-group-op-": OperationType.DELETE_GROUP,
        "transaction-op-": OperationType.TRANSACTION
    }

    for prefix, operation_type in operation_prefixes.items():
        if not request_id.startswith(prefix):
            continue

        try:
            operation_id = int(request_id[len(prefix):])
        except ValueError:
            return None

        validation = OperationValidation.objects.select_related(
            "operation",
            "operation__group"
        ).filter(
            operation_id=operation_id,
            validator_phone_number=phone_number,
            status=ValidationStatus.PENDING,
            operation__operation_type=operation_type,
            operation__status=OperationStatus.PENDING,
            operation__expires_at__gt=now
        ).first()
        if validation is None:
            return None

        operation = validation.operation
        accepted_count = operation.validations.filter(
            status=ValidationStatus.ACCEPTED
        ).count()
        initiator = User.objects.filter(
            phone_number=operation.initiator_phone_number
        ).values("phone_number", "full_name").first()

        return {
            "id": request_id,
            "request_type": f"{operation_type}_REQUEST",
            "operation_type": operation.operation_type,
            "operation_type_display": operation.get_operation_type_display(),
            "group": {
                "id": operation.group_id,
                "name": operation.group.group_name
            },
            "initiator": initiator or {
                "phone_number": operation.initiator_phone_number,
                "full_name": None
            },
            "initiated_at": operation.created_at,
            "expires_at": operation.expires_at,
            "status": operation.status,
            "details": {
                "payload": operation.payload,
                "validators_required": operation.group.quorum,
                "validators_accepted": accepted_count
            }
        }

    return None



# def get_notification_inbox(user):
#     notifications = Notification.objects.filter(
#         recipient_phone_number=user.phone_number
#     ).order_by("-created_at")

#     return {
#         "count": notifications.count(),
#         "results": [
#             {
#                 "id": n.id,
#                 "title": n.title,
#                 "message": n.message,
#                 "created_at": n.created_at,
#                 # "actionable": n.actionable,
#                 "source_type": n.source_type,
#             }
#             for n in notifications
#         ]
#     }


def get_notification_inbox(user):
    notifications = Notification.objects.filter(
        recipient_phone_number=user.phone_number
    ).order_by("-created_at")

    return {
        "count": notifications.count(),
        "results": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "created_at": n.created_at,

                # Source de la notification
                "source_type": n.source_type,
                "source_reference": n.source_reference,

                # Informations sur l'action
                "action_required": n.action_required,
                "action_type": n.action_type,
                "available_actions": n.available_actions,

                # État
                "is_read": n.is_read,

                # Données complémentaires
                "payload": n.payload,
            }
            for n in notifications
        ]
    }

# operation_id