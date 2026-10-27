
import api from './api';

export type GroupCreationData = {
  group_name: string;
  quorum: number;
  validators: {
    phone_number: string;
  }[];
};

export const createGroupRequest = async (data: GroupCreationData) => {
  const response = await api.post('groups/create-request/', data);
  return response.data;
};
