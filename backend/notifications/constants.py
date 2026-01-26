from enum import Enum

class OperationEvent(str, Enum):
    VALIDATION_RECORDED = "validation_recorded"

    GROUP_CREATED = "group_created"
    GROUP_CREATION_REJECTED = "group_creation_rejected"

    GROUP_DELETED = "group_deleted"
    GROUP_DELETION_REJECTED = "group_deletion_rejected"

    VALIDATOR_ADDED = "validator_added"
    ADD_VALIDATOR_REJECTED = "add_validator_rejected"

    VALIDATOR_REMOVED = "validator_removed"
    REMOVE_VALIDATOR_REJECTED = "remove_validator_rejected"

    GROUP_CREATION_REQUEST = "group_creation_request"
