from django.utils import timezone
from notifications.services.operation_notifications import notify_operation_status
from notifications.constants import OperationEvent
from django.db import transaction
from groups.services.receipt_service import generate_receipt


from groups.models import (
    Operation,
    OperationValidation,
    OperationStatus,
    ValidationStatus,
    GroupMembership,
    GroupRole,
    OperationType,
    Account,
    Transaction,
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

        if operation.operation_type == OperationType.ADD_VALIDATOR:
            event = OperationEvent.ADD_VALIDATOR_REJECTED
        elif operation.operation_type == OperationType.REMOVE_VALIDATOR:
            event = OperationEvent.REMOVE_VALIDATOR_REJECTED
        elif operation.operation_type == OperationType.DELETE_GROUP:
            event = OperationEvent.DELETE_GROUP_REJECTED
        elif operation.operation_type == OperationType.TRANSACTION:
            event = OperationEvent.TRANSACTION_REJECTED
        else:
            event = None

        if event:
            notify_operation_status(source=operation, event=event)
        return True, "L’opération a été rejetée"

    # quorum atteint
    if approved >= group.quorum:
        execute_operation(operation)

        operation.status = OperationStatus.APPROVED
        operation.resolved_at = timezone.now()
        operation.save(update_fields=["status", "resolved_at"])

        if operation.operation_type == OperationType.ADD_VALIDATOR:
            event = OperationEvent.VALIDATOR_ADDED
        elif operation.operation_type == OperationType.REMOVE_VALIDATOR:
            event = OperationEvent.VALIDATOR_REMOVED
        elif operation.operation_type == OperationType.DELETE_GROUP:
            event = OperationEvent.GROUP_DELETED
        elif operation.operation_type == OperationType.TRANSACTION:
            # Pour les transactions, la notification est créée par execute_transaction
            event = None
        else:
            event = None

        if event:
            notify_operation_status(source=operation, event=event)
        return True, "L’opération a été validée et exécutée"

    # quorum pas encore atteint → notification individuelle
    notify_operation_status(
        source=operation,
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

    User = get_user_model()

    notification_event = None
    notification_source = None
    notification_actor = None

    with transaction.atomic():

        # 1. Verrouiller l'opération
        try:
            operation = Operation.objects.select_for_update().select_related(
                "group"
            ).get(pk=operation.pk)
        except Operation.DoesNotExist:
            return False, "Cette opération n'existe plus"

        if operation.operation_type != OperationType.ADD_VALIDATOR:
            return False, "Opération invalide"

        if operation.status not in [
            OperationStatus.PENDING,
            OperationStatus.APPROVED
        ]:
            return False, "Cette opération n'est plus en attente"

        if operation.expires_at < timezone.now():
            return False, "Cette demande a expiré"

        # 2. Récupérer le validateur autorisé à répondre
        try:
            validation = OperationValidation.objects.get(
                operation=operation,
                validator_phone_number=validator_phone
            )
        except OperationValidation.DoesNotExist:
            return False, "Vous n'êtes pas autorisé à répondre"

        if validation.status != ValidationStatus.PENDING:
            return False, "Vous avez déjà répondu"

        group = operation.group

        # 3. Enregistrer la réponse
        validation.status = (
            ValidationStatus.ACCEPTED
            if accept
            else ValidationStatus.REJECTED
        )
        validation.rejection_reason = (
            rejection_reason if not accept else None
        )
        validation.validated_at = timezone.now()
        validation.save()

        # 4. Calculer les réponses
        total = operation.validations.count()

        accepted = operation.validations.filter(
            status=ValidationStatus.ACCEPTED
        ).count()

        rejected = operation.validations.filter(
            status=ValidationStatus.REJECTED
        ).count()

        remaining = total - (accepted + rejected)
        max_possible_accept = accepted + remaining

        # 5. Vérifier si le quorum est encore atteignable
        if max_possible_accept < group.quorum:

            operation.mark_rejected()

            notification_event = OperationEvent.ADD_VALIDATOR_REJECTED
            notification_source = group
            notification_actor = validator_phone

            message = "Demande de validateur rejetée (quorum impossible)"

        # 6. Le quorum est atteint : vérifier la limite des trois groupes
        elif accepted >= group.quorum:

            payload = operation.payload or {}

            validator_phone_to_add = payload.get(
                "validator_phone_number"
            )
            cin = payload.get("cin")

            if not validator_phone_to_add or not cin:
                return False, "Les informations du validateur sont incomplètes"

            # Verrouiller le compte du futur membre
            try:
                User.objects.select_for_update().get(
                    phone_number=validator_phone_to_add
                )
            except User.DoesNotExist:
                return False, "Ce compte utilisateur n'existe plus"

            # Recalculer les groupes en excluant cette opération
            stats = get_user_group_stats(
                validator_phone_to_add,
                exclude_operation_id=operation.id
            )

            if stats["total_groups"] >= 3:

                # La personne n'a plus de place disponible
                operation.mark_rejected()

                notification_event = OperationEvent.ADD_VALIDATOR_REJECTED
                notification_source = operation
                notification_actor = validator_phone_to_add

                message = (
                    "L'ajout a été annulé : ce numéro appartient déjà "
                    "à trois groupes ou dispose de réservations "
                    "qui occupent ses places disponibles."
                )

            else:

                # Vérifier une dernière fois les doublons
                already_member = GroupMembership.objects.filter(
                    group=group,
                    phone_number=validator_phone_to_add,
                    left_at__isnull=True
                ).exists()

                if already_member:
                    operation.mark_rejected()

                    notification_event = OperationEvent.ADD_VALIDATOR_REJECTED
                    notification_source = operation
                    notification_actor = validator_phone_to_add

                    message = "Ce numéro appartient déjà à ce groupe"

                else:
                    # 7. Créer l'adhésion
                    GroupMembership.objects.create(
                        group=group,
                        phone_number=validator_phone_to_add,
                        cin=cin,
                        role=GroupRole.VALIDATOR
                    )

                    group.update_active_status()
                    operation.mark_completed()

                    notification_event = OperationEvent.VALIDATOR_ADDED
                    notification_source = operation
                    notification_actor = validator_phone_to_add

                    message = (
                        "Le validateur a été ajouté au groupe "
                        "(Quorum atteint)"
                    )

        else:
            # 8. Quorum pas encore atteint
            notification_event = OperationEvent.VALIDATION_RECORDED
            notification_source = operation
            notification_actor = validator_phone

            message = "Votre réponse a été enregistrée"

    # 9. Envoyer la notification après la transaction
    if notification_event:
        try:
            notify_operation_status(
                source=notification_source,
                event=notification_event,
                actor_phone=notification_actor
            )
        except Exception as e:
            print(f"Erreur notification : {str(e)}")

    return True, message

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

    group = operation.group
    total = operation.validations.count()
    accepted = operation.validations.filter(
        status=ValidationStatus.ACCEPTED
    ).count()
    rejected = operation.validations.filter(
        status=ValidationStatus.REJECTED
    ).count()

    # 📊 Vérifier si le quorum est encore atteignable
    remaining = total - (accepted + rejected)
    max_possible_accept = accepted + remaining

    if max_possible_accept < group.quorum:
        # ❌ Quorum impossible à atteindre → rejet
        operation.mark_rejected()
        try:
            notify_operation_status(
                source=operation,
                event=OperationEvent.REMOVE_VALIDATOR_REJECTED,
                actor_phone=validator_phone
            )
        except Exception as e:
            print(f"Erreur notification validateur rejeté: {str(e)}")
        return True, "Suppression refusée (quorum impossible)"

    # if quorum reached, remove validator
    if accepted >= group.quorum:
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

        with transaction.atomic():
            membership.left_at = timezone.now()
            membership.save()

            # recalculer état du groupe après départ
            operation.group.update_active_status()
            operation.mark_completed()

        try:
            notify_operation_status(
                source=operation,
                event=OperationEvent.VALIDATOR_REMOVED,
                actor_phone=phone_to_remove
            )
        except Exception as e:
            print(f"Erreur notification validateur supprimé: {str(e)}")

        return True, "Le validateur a été supprimé du groupe (Quorum atteint)"

    # if quorum not yet reached but still possible
    try:
        notify_operation_status(
            source=operation,
            event=OperationEvent.VALIDATION_RECORDED,
            actor_phone=validator_phone
        )
    except Exception as e:
        print(f"Erreur notification validation enregistrée: {str(e)}")
    
    return True, "Votre réponse a été enregistrée"

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
    group.mark_as_deleted()

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

        try:
            notify_operation_status(
                source=operation,
                event=OperationEvent.DELETE_GROUP_REJECTED,
                actor_phone=validator_phone
            )
        except Exception as e:
            print(f"Erreur notification suppression rejetée: {str(e)}")

        return True, "Suppression refusée"

    # Vérification unanimité
    total = operation.validations.count()
    accepted = operation.validations.filter(
        status=ValidationStatus.ACCEPTED
    ).count()

    if accepted < total:
        try:
            notify_operation_status(
                source=operation,
                event=OperationEvent.VALIDATION_RECORDED,
                actor_phone=validator_phone
            )
        except Exception as e:
            print(f"Erreur notification validation enregistrée: {str(e)}")
        return True, "Validation enregistrée"

    # ✅ Tous acceptés → suppression réelle
    group = operation.group
    with transaction.atomic():
        group.mark_as_deleted()

        operation.status = OperationStatus.COMPLETED
        operation.save()

    try:
        notify_operation_status(
            source=operation,
            event=OperationEvent.DELETE_GROUP_COMPLETED
        )
    except Exception as e:
        print(f"Erreur notification suppression complétée: {str(e)}")

    return True, "Le groupe a été supprimé"

def execute_remove_validator(operation: Operation) -> None:
    # Support both payload keys for backward compatibility
    validator_phone = operation.payload.get("validator_phone_to_remove") or operation.payload.get("validator_phone_number")
    
    if not validator_phone:
        raise KeyError("Missing validator phone number in operation payload")

    GroupMembership.objects.filter(
        group=operation.group,
        phone_number=validator_phone,
        left_at__isnull=True
    ).update(
        left_at=timezone.now(),
        is_active=False
    )

    # lorsque l’opération de suppression/ajout de validateurs passe, l’appelant
    # a déjà mis à jour l’état via update_active_status. Ici on peut recaler juste
    # au cas où.
    operation.group.update_active_status()


def execute_group_deletion(operation: Operation) -> None:

    group = operation.group
    group.mark_as_deleted()

    operation.status = OperationStatus.COMPLETED
    operation.completed_at = timezone.now()
    operation.save(update_fields=["status", "completed_at"])

    notify_operation_status(
        source=operation,
        event=OperationEvent.GROUP_DELETED
    )


def execute_transaction(operation: Operation) -> bool:
    """
    Exécute le transfert. Retourne True UNIQUEMENT si l'argent a réellement
    bougé (c'est ce booléen, et tx.executed_at, qui font foi pour le justificatif).
    Idempotent : un second appel sur la même opération ne fait rien.
    """
    with transaction.atomic():
        # Verrou ligne : les exécutions concurrentes passent une par une
        Operation.objects.select_for_update().get(pk=operation.pk)
        operation.refresh_from_db()
        tx = Transaction.objects.select_for_update().get(operation=operation)

        # Déjà exécutée ou opération clôturée : on ne refait rien
        if tx.executed_at is not None or operation.status in (
            OperationStatus.COMPLETED,
            OperationStatus.REJECTED,
            OperationStatus.CANCELLED,
            OperationStatus.EXPIRED,
        ):
            return False

        def reject() -> bool:
            operation.status = OperationStatus.REJECTED
            operation.resolved_at = timezone.now()
            operation.save(update_fields=["status", "resolved_at"])
            notify_operation_status(
                source=operation,
                event=OperationEvent.TRANSACTION_REJECTED,
            )
            return False

        try:
            group_account = Account.objects.select_for_update().get(
                owner_type="GROUP",
                owner_group=operation.group,
                is_active=True,
            )
        except Account.DoesNotExist:
            return reject()

        if group_account.balance < tx.amount:
            return reject()

        recipient_account, _ = Account.objects.get_or_create(
            owner_type="USER",
            owner_phone_number=tx.recipient_phone_number,
            defaults={"balance": 0, "is_active": True},
        )
        recipient_account = Account.objects.select_for_update().get(pk=recipient_account.pk)

        group_account.balance -= tx.amount
        recipient_account.balance += tx.amount
        group_account.save(update_fields=["balance"])
        recipient_account.save(update_fields=["balance"])

        tx.debited_account = group_account
        tx.credited_account = recipient_account
        tx.executed_at = timezone.now()
        tx.save(update_fields=["debited_account", "credited_account", "executed_at"])

        operation.status = OperationStatus.COMPLETED
        operation.completed_at = timezone.now()
        operation.save(update_fields=["status", "completed_at"])

        notify_operation_status(
            source=operation,
            event=OperationEvent.TRANSACTION_EXECUTED,
        )

        tx_id = tx.pk
        transaction.on_commit(lambda: generate_receipt(tx_id))
        return True

def respond_to_transaction_request(
    *,
    operation: Operation,
    validator_phone: str,
    accept: bool,
    rejection_reason: str | None = None,
):
    with transaction.atomic():
        # Verrou : deux validateurs simultanés sont traités l'un après l'autre
        Operation.objects.select_for_update().get(pk=operation.pk)
        operation.refresh_from_db()

        if operation.operation_type != OperationType.TRANSACTION:
            return False, "Opération invalide"

        if operation.status != OperationStatus.PENDING:
            return False, "Cette opération n'est plus active"

        if operation.check_and_expire():
            return False, "Cette demande a expiré"

        try:
            ov = OperationValidation.objects.get(
                operation=operation,
                validator_phone_number=validator_phone,
            )
        except OperationValidation.DoesNotExist:
            return False, "Vous n'êtes pas autorisé à répondre"

        if ov.status != ValidationStatus.PENDING:
            return False, "Vous avez déjà répondu"

        ov.status = ValidationStatus.ACCEPTED if accept else ValidationStatus.REJECTED
        ov.rejection_reason = rejection_reason if not accept else None
        ov.validated_at = timezone.now()
        ov.save()

        group = operation.group
        total = operation.validations.count()
        accepted = operation.validations.filter(status=ValidationStatus.ACCEPTED).count()
        rejected = operation.validations.filter(status=ValidationStatus.REJECTED).count()

        remaining = total - (accepted + rejected)
        if accepted + remaining < group.quorum:
            operation.status = OperationStatus.REJECTED
            operation.resolved_at = timezone.now()
            operation.save(update_fields=["status", "resolved_at"])
            notify_operation_status(
                source=operation,
                event=OperationEvent.TRANSACTION_REJECTED,
                actor_phone=validator_phone,
            )
            return True, "Transaction rejetée (quorum impossible)"

        if accepted >= group.quorum:
            if execute_transaction(operation):
                return True, "Transaction approuvée et exécutée"
            return True, (
                "Quorum atteint, mais la transaction n'a pas pu être exécutée "
                "(le solde du groupe a changé depuis la demande)."
            )

        notify_operation_status(
            source=operation,
            event=OperationEvent.VALIDATION_RECORDED,
            actor_phone=validator_phone,
        )
        return True, "Validation enregistrée"

def execute_operation(operation: Operation) -> bool:
    if operation.operation_type == OperationType.ADD_VALIDATOR:
        execute_add_validator(operation)
    elif operation.operation_type == OperationType.REMOVE_VALIDATOR:
        execute_remove_validator(operation)
    elif operation.operation_type == OperationType.DELETE_GROUP:
        execute_group_deletion(operation)
    elif operation.operation_type == OperationType.TRANSACTION:
        return execute_transaction(operation)
    return True

    
