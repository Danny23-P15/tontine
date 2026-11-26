from groups.models import GroupMembership, GroupRole
from groups.models import ValidationGroup, TemporaryGroupCreation
from django.utils import timezone
from groups.models import Operation, OperationType, OperationStatus, Account
from decimal import Decimal




def get_user_group_stats(phone_number: str) -> dict:

    # Groupes dans lesquels l'utilisateur est initiateur
    initiated_groups = ValidationGroup.objects.filter(
        initiator_phone_number=phone_number,
        is_active=True,
        deleted_at__isnull=True
    ).values_list("id", flat=True)

    # Groupes dans lesquels l'utilisateur est validateur actif
    validator_groups = GroupMembership.objects.filter(
        phone_number=phone_number,
        role=GroupRole.VALIDATOR,
        left_at__isnull=True,
        is_active=True,
        group__is_active=True,
        group__deleted_at__isnull=True
    ).values_list("group_id", flat=True)

    # Regrouper les identifiants sans doublons
    initiated_ids = set(initiated_groups)
    validator_ids = set(validator_groups)

    all_group_ids = initiated_ids | validator_ids

    return {
        "initiator_count": len(initiated_ids),
        "validator_count": len(validator_ids),
        "total_groups": len(all_group_ids),
    }


def has_pending_non_transaction_operations(
    group: ValidationGroup,
    initiator_phone: str
) -> bool:
    
    return Operation.objects.filter(
        group=group,
        initiator_phone_number=initiator_phone,
        status=OperationStatus.PENDING,
    ).exclude(
        operation_type=OperationType.TRANSACTION
    ).exists()


def can_create_group(phone_number: str) -> tuple[bool, str | None]:
    stats = get_user_group_stats(phone_number)
    active_request_exists = TemporaryGroupCreation.objects.filter(
        initiator_phone_number=phone_number,
        is_cancelled=False,
        expires_at__gt=timezone.now()
    ).exists()

    if stats["initiator_count"] >= 1:
        return False, "Vous êtes déjà initiateur d’un groupe"

    if stats["total_groups"] >= 3:
        return False, (
            "Vous appartenez déjà à 3 groupes de validation "
            "(1+2 ou 0+3)"
        )
    if active_request_exists:
        return (
            False,
            "Vous avez déjà une demande de création de groupe en cours."
        )

    return True, None


def can_add_validator_to_temp_group(
    initiator_phone: str,
    validator_phone: str,
    validator_cin: str,
    temp_validators: list[dict]
) -> tuple[bool, str | None]:

    stats = get_user_group_stats(validator_phone)

    if stats["total_groups"] >= 3:
        return False, "Ce numéro appartient déjà à 3 groupes"

    if initiator_phone == validator_phone:
        return False, "Vous ne pouvez pas vous ajouter vous-même"

    if any(v["cin"] == validator_cin for v in temp_validators):
        return False, "Ce CIN est déjà utilisé dans ce groupe"

    # Ne pas dépasser 5 validateurs lors de la création temporaire
    if len(temp_validators) >= 5:
        return False, "Un groupe ne peut pas dépasser 5 validateurs"

    return True, None


def can_add_validator(
    group: ValidationGroup,
    initiator_phone: str,
    validator_phone: str,
    validator_cin: str
) -> tuple[bool, str | None]:

    # 1. Empêcher l'initiateur de s'ajouter lui-même
    if initiator_phone == validator_phone:
        return False, "Vous ne pouvez pas vous ajouter vous-même"

    # 2. Vérifier les opérations déjà en attente
    if has_pending_non_transaction_operations(group, initiator_phone):
        return False, (
            "Une opération est déjà en attente. "
            "Veuillez attendre sa résolution avant d'en initier une nouvelle."
        )

    # 3. Vérifier si le numéro est déjà membre du groupe
    if group.memberships.filter(
        phone_number=validator_phone,
        left_at__isnull=True
    ).exists():
        return False, "Ce numéro appartient déjà à ce groupe"

    # 4. Vérifier si le CIN est déjà utilisé dans ce groupe
    if group.memberships.filter(
        cin=validator_cin,
        left_at__isnull=True
    ).exists():
        return False, "Ce CIN est déjà utilisé dans ce groupe"

    # 5. Vérifier si une demande d'ajout existe déjà
    pending_addition = Operation.objects.filter(
        group=group,
        operation_type=OperationType.ADD_VALIDATOR,
        status__in=[
            OperationStatus.PENDING,
            OperationStatus.APPROVED
        ],
        expires_at__gt=timezone.now(),
        payload__validator_phone_number=validator_phone
    ).exists()

    if pending_addition:
        return False, "Une demande d'ajout existe déjà pour ce numéro"

    # 6. Vérifier le nombre maximal de validateurs
    active_validators_count = group.memberships.filter(
        role=GroupRole.VALIDATOR,
        left_at__isnull=True
    ).count()

    if active_validators_count >= group.validator_max_number:
        return False, (
            f"Le groupe a atteint le nombre maximum "
            f"de validateurs ({group.validator_max_number})"
        )

    # 7. Vérifier la limite globale de trois groupes
    stats = get_user_group_stats(validator_phone)

    if stats["total_groups"] >= 3:
        return False, "Ce numéro appartient déjà à 3 groupes"

    return True, None

def can_remove_validator(
    group: ValidationGroup,
    validator_phone_to_remove: str
) -> tuple[bool, str | None]:

    # Vérifier s'il y a une opération non-transaction en attente
    initiator_phone = group.initiator_phone_number
    if has_pending_non_transaction_operations(group, initiator_phone):
        return False, "Une opération est déjà en attente. Veuillez attendre sa résolution avant d'en initier une nouvelle."

    # 1️⃣ vérifier que le validateur existe
    try:
        membership = GroupMembership.objects.get(
            group=group,
            phone_number=validator_phone_to_remove,
            role=GroupRole.VALIDATOR,
            left_at__isnull=True
        )
    except GroupMembership.DoesNotExist:
        return False, "Ce validateur n’appartient pas à ce groupe"

    # compter les validateurs actifs
    active_validators_count = GroupMembership.objects.filter(
        group=group,
        role=GroupRole.VALIDATOR,
        left_at__isnull=True
    ).count()

    remaining_validators = active_validators_count - 1

    # vérifier la survie du groupe (RÈGLE MÉTIER)
    # Le nombre de validateurs restants doit être supérieur au quorum.
    if remaining_validators <= group.quorum:
        return (
            False,
            "Impossible de supprimer ce validateur : "
            "le nombre de validateurs restants doit être supérieur au quorum"
        )

    return True, None

def can_delete_group(
    group: ValidationGroup,
    initiator_phone: str
) -> tuple[bool, str | None]:

    if group.initiator_phone_number != initiator_phone:
        return False, "Seul l’initiateur peut supprimer le groupe"

    # Vérifier s'il y a une opération non-transaction en attente
    if has_pending_non_transaction_operations(group, initiator_phone):
        return False, "Une opération est déjà en attente. Veuillez attendre sa résolution avant d'en initier une nouvelle."

    if not group.is_active:
        return False, "Le groupe n’est pas actif"

    return True, None

def can_request_transaction(
    *,
    group: ValidationGroup,
    amount: Decimal,
) -> tuple[bool, str | None]:

    if amount <= 0:
        return False, "Le montant doit être supérieur à 0"

    validators_count = group.memberships.filter(
        role=GroupRole.VALIDATOR,
        left_at__isnull=True
    ).count()

    if validators_count == 0:
        return False, "Aucun validateur actif dans le groupe"

    delete_pending = Operation.objects.filter(
        group=group,
        operation_type=OperationType.DELETE_GROUP,
        status=OperationStatus.PENDING
    ).exists()

    if delete_pending:
        return False, "Une suppression de groupe est en cours"

    # Vérifier le solde du compte du groupe
    try:
        group_account = Account.objects.get(
            owner_type="GROUP",
            owner_group=group,
            is_active=True
        )
        if group_account.balance < amount:
            return False, f"Solde insuffisant. Solde actuel: {group_account.balance}, Montant demandé: {amount}"
    except Account.DoesNotExist:
        return False, "Le groupe n'a pas de compte actif"

    return True, None