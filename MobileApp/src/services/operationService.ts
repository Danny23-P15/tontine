// import api from './api';

// export const respondToOperation = async (
//   operation_id: number,
//   accept: boolean,
//   rejection_reason?: string
// ) => {
//   const response = await api.post('operations/respond/', {
//     operation_id,
//     accept,
//     ...(accept ? {} : { rejection_reason }),
//   });

//   return response.data;
// };


import api from './api';

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
