
import api from './api';

export const getGroupDetail = async (groupId: number) => {
  const response = await api.get(`groups/${groupId}/`);
  return response.data;
};
