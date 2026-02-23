from groups.models import GroupMembership, GroupRole
from groups.models import ValidationGroup, TemporaryGroupCreation
from django.utils import timezone


def get_user_group_stats(phone_number: str) -> dict:
    memberships = GroupMembership.objects.filter(
        phone_number=phone_number,
        left_at__isnull=True
    )

    initiator_count = memberships.filter(
        role=GroupRole.INITIATOR,
        left_at__isnull=True,
        group__is_active=True,
        group__deleted_at__isnull=True
    ).count()

    validator_count = memberships.filter(
        role=GroupRole.VALIDATOR
    ).count()

    total_groups = memberships.count()

    return {
        "initiator_count": initiator_count,
        "validator_count": validator_count,
        "total_groups": total_groups,
    }


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

    if initiator_phone == validator_phone:
        return False, "Vous ne pouvez pas vous ajouter vous-même"

    if any(v["cin"] == validator_cin for v in temp_validators):
        return False, "Ce CIN est déjà utilisé dans ce groupe"

    # Ne pas dépasser 5 validateurs lors de la création temporaire
    if len(temp_validators) >= 5:
        return False, "Un groupe ne peut pas dépasser 5 validateurs"

    stats = get_user_group_stats(validator_phone)

    if stats["total_groups"] >= 3:
        return False, "Ce numéro appartient déjà à 3 groupes"

    return True, None


def can_add_validator(
    group: ValidationGroup,
    initiator_phone: str,
    validator_phone: str,
    validator_cin: str
) -> tuple[bool, str | None]:

    if initiator_phone == validator_phone:
        return False, "Vous ne pouvez pas vous ajouter vous-même"

    # CIN déjà utilisé dans ce groupe
    if group.memberships.filter(
        cin=validator_cin,
        left_at__isnull=True
    ).exists():
        return False, "Ce validateur (CIN) est déjà dans le groupe"

    # Limite maximale de validateurs par groupe
    active_validators_count = group.memberships.filter(
        role=GroupRole.VALIDATOR,
        left_at__isnull=True
    ).count()

    if active_validators_count >= getattr(group, "validator_max_number", 5):
        return False, "Le groupe a atteint le nombre maximum de validateurs (5)"

    stats = get_user_group_stats(validator_phone)

    if stats["total_groups"] >= 3:
        return False, "Ce numéro appartient déjà à 3 groupes"

    return True, None


def can_remove_validator(
    group: ValidationGroup,
    validator_phone_to_remove: str
) -> tuple[bool, str | None]:

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
    if remaining_validators <= group.quorum:
        return (
            False,
            "Impossible de supprimer ce validateur : "
            "le groupe deviendrait inactif"
        )

    return True, None

def can_delete_group(
    group: ValidationGroup,
    initiator_phone: str
) -> tuple[bool, str | None]:

    if group.initiator_phone_number != initiator_phone:
        return False, "Seul l’initiateur peut supprimer le groupe"

    if not group.is_active:
        return False, "Le groupe n’est pas actif"

    return True, None

