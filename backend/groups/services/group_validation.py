from django.utils import timezone
from groups.models import (
    TemporaryGroupCreation,
    TemporaryGroupValidator,
    ValidationGroup,
    GroupMembership,
    GroupRole,
    Operation,
    OperationStatus
)
from notifications.services.notification_service import notify
from notifications.models import NotificationSourceType
from notifications.constants import OperationEvent
from notifications.services.operation_notifications import notify_operation_status


def respond_to_group_creation(
    temp_group_id: int,
    validator_phone: str,
    accept: bool,
    rejection_reason: str | None = None
):
    try:
        temp_group = TemporaryGroupCreation.objects.get(
            id=temp_group_id,
            is_cancelled=False
        )
    except TemporaryGroupCreation.DoesNotExist:
        return False, "Cette demande n’existe pas ou a été annulée"

    if temp_group.expires_at < timezone.now():
        temp_group.is_cancelled = True
        temp_group.save(update_fields=["is_cancelled"])
        return False, "La demande a expiré"

    try:
        validator = TemporaryGroupValidator.objects.get(
            temp_group=temp_group,
            phone_number=validator_phone
        )
    except TemporaryGroupValidator.DoesNotExist:
        return False, "Vous n’êtes pas autorisé à valider ce groupe"

    if validator.has_accepted is not None:
        return False, "Vous avez déjà répondu à cette demande"

    # enregistrer la réponse
    validator.has_accepted = accept
    validator.rejection_reason = rejection_reason if not accept else None
    validator.responded_at = timezone.now()
    validator.save()

    # ❌ un seul refus = rejet total
    if not accept:
        temp_group.is_cancelled = True
        temp_group.save(update_fields=["is_cancelled"])

        notify_operation_status(
            operation=temp_group,
            event=OperationEvent.GROUP_CREATION_REJECTED,
            actor_phone=validator_phone
        )

        return True, "Vous avez refusé la création du groupe"

    # vérification unanimité
    total = temp_group.validators.count()
    accepted = temp_group.validators.filter(has_accepted=True).count()

    if accepted < total:
        notify_operation_status(
            operation=temp_group,
            event=OperationEvent.VALIDATION_RECORDED,
            actor_phone=validator_phone
        )
        return True, "Votre validation a été enregistrée"

    # ✅ tous acceptés → création du groupe
    group = ValidationGroup.objects.create(
        group_name=temp_group.group_name,
        initiator_phone_number=temp_group.initiator_phone_number,
        quorum=temp_group.quorum
    )

    GroupMembership.objects.create(
        group=group,
        phone_number=group.initiator_phone_number,
        cin="INITIATOR",
        role=GroupRole.INITIATOR
    )

    for v in temp_group.validators.all():
        GroupMembership.objects.create(
            group=group,
            phone_number=v.phone_number,
            cin=v.cin,
            role=GroupRole.VALIDATOR
        )

    group.update_active_status()
    temp_group.delete()

    notify_operation_status(
        operation=group,
        event=OperationEvent.GROUP_CREATED
    )

    return True, "Le groupe a été créé avec succès"


def respond_to_group_deletion(operation: Operation):
    group = operation.group
    validations = operation.validations.all()

    # ❌ un seul refus = rejet définitif
    if validations.filter(status=OperationStatus.REJECTED).exists():
        operation.status = OperationStatus.REJECTED
        operation.resolved_at = timezone.now()
        operation.save(update_fields=["status", "resolved_at"])

        notify_operation_status(
            operation=operation,
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
        operation=operation,
        event=OperationEvent.GROUP_DELETED
    )
