from enum import Enum

class OperationEvent(str, Enum):
    VALIDATION_RECORDED = "validation_recorded"

    GROUP_CREATED = "group_created"
    GROUP_CREATION_REJECTED = "group_creation_rejected"

    GROUP_DELETED = "group_deleted"
    GROUP_DELETION_REJECTED = "group_deletion_rejected"

    ADD_VALIDATOR_REQUESTED = "add_validator_requested"
    VALIDATOR_ADDED = "validator_added"
    ADD_VALIDATOR_REJECTED = "add_validator_rejected"

    VALIDATOR_REMOVED = "validator_removed"
    REMOVE_VALIDATOR_REQUESTED = "remove_validator_requested"
    REMOVE_VALIDATOR_REJECTED = "remove_validator_rejected"

    GROUP_CREATION_REQUEST = "group_creation_request"

    DELETE_GROUP_REQUESTED = "delete_group_requested"
    DELETE_GROUP_REJECTED = "delete_group_rejected"
    DELETE_GROUP_COMPLETED = "delete_group_completed"
    DELETE_GROUP_EXPIRED = "delete_group_expired"

    # transactions
    TRANSACTION_REQUESTED = "transaction_requested"
    TRANSACTION_APPROVED = "transaction_approved"
    TRANSACTION_REJECTED = "transaction_rejected"
    TRANSACTION_EXECUTED = "transaction_executed"
