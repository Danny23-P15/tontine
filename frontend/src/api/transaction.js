import api from "../services/api";

export const fetchTransactionStats = async (groupId, period) => {
  const response = await api.get(
    `/groups/${groupId}/transactions/stats/?period=${period}`
  );
  return response.data;
};