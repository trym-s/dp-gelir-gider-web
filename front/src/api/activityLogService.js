import { api } from './api';

export const getActivityLogs = async () => {
  try {
    const response = await api.get('/activity-log/');
    return response.data;
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    throw error;
  }
};
