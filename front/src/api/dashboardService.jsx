import { api } from './api';

export const getExpenseReport = async (startDate, endDate, options = {}) => {
  try {
    console.log("Requesting expense report with params:", { startDate, endDate, options });
    const response = await api.get('/expense_report', {
      params: {
        start_date: startDate,
        end_date: endDate,
        group_by: options.groupBy,
        group_name: options.groupName,
      },
      signal: options.signal,
    });
    return response.data;
  } catch (error) {
    console.error("Gider raporu alınırken hata oluştu:", error);
    throw error;
  }
};

export const getIncomeReport = async (startDate, endDate, options = {}) => {
  try {
    console.log("Requesting income report with params:", { startDate, endDate, options });
    const response = await api.get('/income_report', {
      params: {
        start_date: startDate,
        end_date: endDate,
        group_by: options.groupBy,
        group_name: options.groupName,
      },
      signal: options.signal,
    });
    return response.data;
  } catch (error) {
    console.error("Gelir raporu alınırken hata oluştu:", error);
    throw error;
  }
};

export const getExpenseGraphData = async (startDate, endDate) => {
  console.log("Requesting expense graph data with params:", { startDate, endDate });
  const response = await api.get('/expense_graph', {
    params: { start_date: startDate, end_date: endDate }
  });
  return response.data;
};

export const getExpenseDistributionData = async (startDate, endDate, groupBy) => {
  console.log("Requesting expense distribution data with params:", { startDate, endDate, groupBy });
  const response = await api.get('/expense_distribution', {
    params: { start_date: startDate, end_date: endDate, group_by: groupBy }
  });
  return response.data;
};

export const getIncomeGraphData = async (startDate, endDate) => {
  console.log("Requesting income graph data with params:", { startDate, endDate });
  const response = await api.get('/income_graph', {
    params: { start_date: startDate, end_date: endDate }
  });
  return response.data;
};

export const getIncomeDistributionData = async (startDate, endDate, groupBy) => {
    console.log("Requesting income distribution data with params:", { startDate, endDate, groupBy });
    const response = await api.get('/income_distribution', {
        params: { start_date: startDate, end_date: endDate, group_by: groupBy }
    });
    return response.data;
};

export const getCombinedIncomeExpenseData = async (startDate, endDate) => {
  console.log("Requesting combined income/expense data with params:", { startDate, endDate });
  const response = await api.get('/combined_income_expense_graph', {
    params: { start_date: startDate, end_date: endDate }
  });
  return response.data;
};
