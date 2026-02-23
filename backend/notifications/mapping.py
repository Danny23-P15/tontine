from notifications.constants import OperationEvent
from notifications.models import NotificationSourceType

OPERATION_NOTIFICATION_MAP = {

    # =========================
    # 🔔 CRÉATION DE GROUPE
    # =========================

    OperationEvent.GROUP_CREATION_REQUEST: {
        "source_type": NotificationSourceType.TEMP_GROUP_CREATION,
        "recipients": ["validators"],
        "title": "Demande de création de groupe",
        "message": (
            "Vous avez été invité à valider la création du groupe "
            "« {group_name} »."
        ),
        "actionable": True,
    },

    OperationEvent.VALIDATION_RECORDED: {
        "source_type": NotificationSourceType.TEMP_GROUP_CREATION,
        "recipients": ["initiator"],
        "title": "Validation enregistrée",
        "message": (
            "{validator_phone} a validé la création du groupe "
            "« {group_name} »."
        ),
        "actionable": False,
    },


    OperationEvent.GROUP_CREATION_REJECTED: {
        "source_type": NotificationSourceType.TEMP_GROUP_CREATION,
        "recipients": ["initiator", "validators"],
        "title": "Création du groupe refusée",
        "message": (
            "La création du groupe « {group_name} » a été refusée."
        ),
        "actionable": False,
    },

    OperationEvent.GROUP_CREATED: {
        "source_type": NotificationSourceType.GROUP,
        "recipients": ["initiator", "validators"],
        "title": "Groupe créé",
        "message": (
            "Le groupe « {group_name} » a été créé avec succès suite à la validation de tous les validateurs."
        ),
        "actionable": False,
    },

    # =========================
    # 🔁 OPÉRATIONS SUR GROUPE
    # =========================

    OperationEvent.GROUP_DELETED: {
        "source_type": NotificationSourceType.OPERATION,
        "recipients": ["initiator", "validators"],
        "title": "Groupe supprimé",
        "message": (
            "Le groupe « {group_name} » a été supprimé."
        ),
        "actionable": False,
    },

    OperationEvent.GROUP_DELETION_REJECTED: {
        "source_type": NotificationSourceType.OPERATION,
        "recipients": ["initiator", "validators"],
        "title": "Suppression du groupe refusée",
        "message": (
            "La suppression du groupe « {group_name} » a été refusée."
        ),
        "actionable": False,
    },

    OperationEvent.VALIDATOR_ADDED: {
        "source_type": NotificationSourceType.GROUP,
        "recipients": ["initiator", "validators"],
        "title": "Validateur ajouté",
        "message": (
            "{validator_phone} a été ajouté au groupe « {group_name} »."
        ),
        "actionable": False,
    },

    OperationEvent.ADD_VALIDATOR_REJECTED: {
        "source_type": NotificationSourceType.OPERATION,
        "recipients": ["initiator"],
        "title": "Ajout de validateur refusé",
        "message": (
            "L’ajout du validateur {validator_phone} au groupe "
            "« {group_name} » a été refusé."
        ),
        "actionable": False,
    },

    OperationEvent.VALIDATOR_REMOVED: {
        "source_type": NotificationSourceType.OPERATION,
        "recipients": ["initiator", "validators"],
        "title": "Validateur supprimé",
        "message": (
            "{validator_phone} a été supprimé du groupe « {group_name} »."
        ),
        "actionable": False,
    },

    OperationEvent.REMOVE_VALIDATOR_REJECTED: {
        "source_type": NotificationSourceType.OPERATION,
        "recipients": ["initiator"],
        "title": "Suppression de validateur refusée",
        "message": (
            "La suppression du validateur {validator_phone} du groupe "
            "« {group_name} » a été refusée."
        ),
        "actionable": False,
    },

    OperationEvent.ADD_VALIDATOR_REQUESTED: {
        "source_type": NotificationSourceType.OPERATION,
        "recipients": ["validators"],
        "title": "Validation requise",
        "message": (
            "{validator_phone} souhaite ajouter un nouveau validateur "
            "au groupe « {group_name} »."
        ),
        "actionable": True,
    },

    OperationEvent.REMOVE_VALIDATOR_REQUESTED: {
        "source_type": NotificationSourceType.OPERATION,
        "recipients": ["validators"],
        "title": "Validation requise",
        "message": (
            "{validator_phone} souhaite supprimer un validateur "
            "du groupe « {group_name} »."
        ),
        "actionable": True,
    },

    OperationEvent.VALIDATION_RECORDED: {
        "source_type": NotificationSourceType.OPERATION,
        "recipients": ["initiator"],
        "title": "Validation enregistrée",
        "message": (
            "{validator_phone} a répondu à la demande "
            "d’ajout de validateur pour le groupe « {group_name} »."
        ),
        "actionable": False,
    },

    OperationEvent.DELETE_GROUP_REQUESTED: {
        "source_type": NotificationSourceType.OPERATION,
        "recipients": ["validators"],
        "title": "Validation requise",
        "message": (
            "{validator_phone} souhaite supprimer le groupe "
            "« {group_name} »."
        ),
        "actionable": True,
    },

    OperationEvent.DELETE_GROUP_EXPIRED: {
        "source_type": NotificationSourceType.OPERATION,
        "recipients": ["initiator"],
        "title": "Demande expirée",
        "message": "La demande de suppression du groupe « {group_name} » a expiré.",
    }



}