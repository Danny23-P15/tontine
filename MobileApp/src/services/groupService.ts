import api from './api';

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