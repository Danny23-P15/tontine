
// import api from './api';

// export type PendingNotification = {
//   id: string | number;
//   type?: string;
//   event?: string;
//   title: string;
//   message: string;
//   created_at: string;
//   initiator_phone?: string;
//   quorum?: number;
//   action?: {
//     endpoint: string;
//     method: string;
//     payload: {
//       temp_group_id: number;
//     };
//   };
//   context?: {
//     group_name: string;
//     initiator_phone: string;
//     validators_required: number;
//     validators_accepted: number;
//   };
// };

// type NotificationResponse = {
//   count: number;
//   results: PendingNotification[];
// };

// // Récupérer toutes les notifications en attente
// export const getPendingNotifications =
//   async (): Promise<NotificationResponse> => {
//     const response = await api.get('pending/');
//     return response.data;
//   };

// // Récupérer uniquement les demandes de création de groupe
// export const getPendingGroupCreationNotifications =
//   async (): Promise<PendingNotification[]> => {
//     const data = await getPendingNotifications();

//     return (data.results ?? []).filter(
//       (notification) =>
//         notification.type === 'GROUP_CREATION_REQUEST'
//     );
//   };

// // Récupérer la boîte de réception
// export const getNotificationInbox = async () => {
//   const response = await api.get('inbox/');
//   return response.data;
// };



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
  return response.data as {
    count: number;
    results: PendingNotification[];
  };
}
