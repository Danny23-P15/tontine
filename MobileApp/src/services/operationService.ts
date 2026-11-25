import api from './api';

export type OperationValidation = {
  validator_phone_number: string;
  status: string;
  rejection_reason: string | null;
  validated_at: string | null;
};

export type OperationDetail = {
  reference: string;
  operation_type: string;
  status: string;
  initiator_phone_number: string;
  group: {
    id: number;
    group_name: string;
    quorum: number;
  };
  payload: Record<string, any>;
  created_at: string;
  expires_at: string;
  completed_at: string | null;
  validations: OperationValidation[];
  approved_count: number;
  pending_count: number;
  total_validators: number;
  can_respond: boolean;
  my_validation_status: string;
  receipt_available?: boolean;
};

export const getOperationDetail = async (
  reference: string
): Promise<OperationDetail> => {
  const response = await api.get(
    `operations/${encodeURIComponent(reference)}/`
  );

  return response.data;
};




export const respondToOperation = async (
  operation_id: number,
  accept: boolean,
  rejection_reason?: string,
) => {
  const response = await api.post('operations/respond/', {
    operation_id,
    accept,
    ...(rejection_reason
      ? { rejection_reason }
      : {}),
  });

  return response.data;
};

export const cancelOperation = async (reference: string) => {
  const response = await api.post('operations/cancel/', {
    reference,
  });

  return response.data;
};
