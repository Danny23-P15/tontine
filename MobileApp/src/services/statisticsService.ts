
import api from './api';

export type StatisticsPeriod = 'day' | 'week' | 'month';

export type StatisticsData = {
  group_id: number;
  group_name: string;
  total_transactions: number;
  successful_transactions: number;
  failed_transactions: number;
  success_rate: number;
  chart: {
    period: StatisticsPeriod;
    unit: 'amount';
    data: {
      label: string;
      total: string;
    }[];
  };
};

export const getGroupStatistics = async (
  groupId: number,
  period: StatisticsPeriod
): Promise<StatisticsData> => {
  const response = await api.get<StatisticsData>(
    `groups/${groupId}/statistics/`,
    {
      params: { period },
    }
  );

  return response.data;
};
