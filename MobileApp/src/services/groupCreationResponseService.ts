
import api from './api';

export type PendingGroupCreationNotification = {
  id: string;
  type: string;
  event: string;
  title: string;
  message: string;
  created_at: string;
  initiator_phone: string;
  quorum: number;
  action: {
    endpoint: string;
    method: string;
    payload: {
      temp_group_id: number;
    };
  };
  context: {
    group_name: string;
    initiator_phone: string;
    validators_required: number;
    validators_accepted: number;
  };
};

export const getPendingGroupCreationNotifications =
  async (): Promise<PendingGroupCreationNotification[]> => {
    const response = await api.get('notifications/pending/');
    const results = response.data.results ?? [];

    return results.filter(
      (item: PendingGroupCreationNotification) =>
        item.type === 'GROUP_CREATION_REQUEST',
    );
  };

export const respondToGroupCreation = async (
  temp_group_id: number,
  accept: boolean,
  rejection_reason?: string,
) => {
  const response = await api.post('groups/creation/pending/', {
    temp_group_id,
    accept,
    ...(accept ? {} : { rejection_reason }),
  });

  return response.data;
};
