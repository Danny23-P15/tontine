-- Table: User
CREATE TABLE user (
    id BIGSERIAL PRIMARY KEY,
    password VARCHAR(128) NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE,
    is_superuser BOOLEAN NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    cin VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL,
    is_staff BOOLEAN NOT NULL,
    date_joined TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Table: validation_group
CREATE TABLE validationgroup (
    id BIGSERIAL PRIMARY KEY,
    group_name VARCHAR(100) NOT NULL,
    initiator_phone_number VARCHAR(20) NOT NULL,
    validator_max_number INTEGER NOT NULL CHECK (validator_max_number >= 0),
    quorum INTEGER NOT NULL CHECK (quorum >= 0),
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Table: group_membership
CREATE TABLE groupmembership (
    id BIGSERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    cin VARCHAR(20) NOT NULL,
    role VARCHAR(10) NOT NULL,
    is_active BOOLEAN NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL,
    left_at TIMESTAMP WITH TIME ZONE,
    group_id BIGINT NOT NULL,
    UNIQUE(group_id, phone_number),
    UNIQUE(group_id, cin),
    FOREIGN KEY (group_id) REFERENCES validationgroup(id)
);

-- Table: temporary_group_creation
CREATE TABLE temporarygroupcreation (
    id BIGSERIAL PRIMARY KEY,
    initiator_phone_number VARCHAR(20) NOT NULL,
    group_name VARCHAR(100) NOT NULL,
    quorum INTEGER NOT NULL CHECK (quorum >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_cancelled BOOLEAN NOT NULL
);

-- Table: Operation
CREATE TABLE operation (
    id BIGSERIAL PRIMARY KEY,
    reference VARCHAR(50) UNIQUE NOT NULL,
    initiator_phone_number VARCHAR(20) NOT NULL,
    operation_type VARCHAR(30) NOT NULL,
    status VARCHAR(15) NOT NULL,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    group_id BIGINT NOT NULL,
    FOREIGN KEY (group_id) REFERENCES validationgroup(id)
);

-- Table: Operation_validation
CREATE TABLE operationvalidation (
    id BIGSERIAL PRIMARY KEY,
    validation_reference VARCHAR(255) UNIQUE,
    validator_phone_number VARCHAR(40) NOT NULL,
    status VARCHAR(50) NOT NULL,
    rejection_reason TEXT,
    validated_at TIMESTAMP WITH TIME ZONE,
    operation_id BIGINT NOT NULL,
    UNIQUE(operation_id, validator_phone_number),
    FOREIGN KEY (operation_id) REFERENCES operation(id)
);

-- Table: temporary_group_validator
CREATE TABLE temporarygroupvalidator (
    id BIGSERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    cin VARCHAR(20) NOT NULL,
    has_accepted BOOLEAN,
    rejection_reason TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    temp_group_id BIGINT NOT NULL,
    UNIQUE(temp_group_id, phone_number),
    UNIQUE(temp_group_id, cin),
    FOREIGN KEY (temp_group_id) REFERENCES temporarygroupcreation(id)
);

-- Table: Notification
CREATE TABLE notification (
    id BIGSERIAL PRIMARY KEY,
    recipient_phone_number VARCHAR(20) NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    source_type VARCHAR(30) NOT NULL,
    source_reference VARCHAR(100) NOT NULL,
    payload JSONB,
    action_required BOOLEAN NOT NULL DEFAULT FALSE,
    action_type VARCHAR(40) NOT NULL,
    available_actions JSONB,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX operation_group_id_idx ON operation (group_id);
CREATE INDEX operation_initiator_phone_idx ON operation (initiator_phone_number);
CREATE INDEX operationvalidation_operation_id_idx ON operationvalidation (operation_id);
CREATE INDEX groupmembership_group_id_idx ON groupmembership (group_id);
CREATE INDEX temporarygroupvalidator_temp_group_id_idx ON temporarygroupvalidator (temp_group_id);
CREATE INDEX notification_recipient_phone_idx ON notification_notification (recipient_phone_number);
CREATE INDEX notification_source_reference_idx ON notification_notification (source_reference);