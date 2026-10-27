
import api from './api';

export type GroupPermission = {
  can_create: boolean;
  reason: string | null;
};

export const checkCanCreateGroup = async (): Promise<GroupPermission> => {
  const response = await api.get('groups/can-create/');
  return response.data;
};
