import api from './api';

export type PendingNotification = {
  id: string | number;
  type: string;
  event?: string;
  title: string;
  message: string;
  created_at: string;
  action?: {
    endpoint: string;
    method: string;
    payload: Record<string, unknown>;
  };
  context?: Record<string, unknown>;
};

export const getPendingNotifications = async () => {
  const response = await api.get('notifications/pending/');
  return response.data as {
    count: number;
    results: PendingNotification[];
  };
};

export const getNotificationInbox = async () => {
  const response = await api.get('notifications/inbox/');
  return response.data;
}

