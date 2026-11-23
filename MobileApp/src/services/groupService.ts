import api from './api';
export type GroupOperation = {
  reference: string;
  operation_type: string;
  status: string;
  initiator_phone_number: string;
  created_at: string;
  expires_at: string | null;
  completed_at: string | null;
};

export const getMyGroups = async () => {
  const response = await api.get('groups/my-groups/');
  return response.data;
}

export const respondToGroupCreation = async (
  temp_group_id: number,
  accept: boolean,
  rejection_reason?: string
) => {
  const response = await api.post('groups/creation/pending/', {
    temp_group_id,
    accept,
    ...(!accept ? { rejection_reason } : {}),
  });

  return response.data;
};


export const requestAddValidator = async (
  group_id: number,
  validator_phone: string
) => {
  const response = await api.post(
    `groups/${group_id}/validator/add/`,
    {
      validator_phone_number: validator_phone,
    }
  );

  return response.data;
};

export const requestRemoveValidator = async (
  group_id: number,
  validator_id: number
) => {
  const response = await api.post(
    `groups/${group_id}/remove-validator/`,
    {
      validator_phone_number: validator_id,
    }
  );

  return response.data;
};

export const getGroupBalance = async (group_id: number) => {
  const response = await api.get(`groups/${group_id}/balance/`);
  return response.data;
}

export interface RequestTransactionResponse {
  reference: string;
}

export const requestTransaction = async (
  group_id: number,
  phone_number: string,
  amount: number,
  reason: string
): Promise<RequestTransactionResponse> => {
  const response = await api.post<RequestTransactionResponse>(
    `groups/${group_id}/transactions/request/`,
    {
      phone_number,
      amount,
      reason,
    }
  );

  return response.data;
};

export const requestDeleteGroup = async (group_id: number) => {
  const response = await api.post('groups/delete/request/', {
    group_id,
  });

  return response.data;
};

export const getMyInitiatedOperations = async () => {
  const response = await api.get('operations/initiated/');
  return response.data;
};

export const getGroupOperations = async (
  groupId: number,
  search: string = ""
): Promise<{ results: GroupOperation[] }> => {
  const response = await api.get(
    `groups/${groupId}/operationsHistory/`,
    {
      params: {
        search: search || undefined,
      },
    }
  );

  return response.data;
};

export const getOperationHistoryDetail = async (
  reference: string
): Promise<any> => {
  const response = await api.get(
    `operations/history/${encodeURIComponent(reference)}/`
  );

  return response.data;
};