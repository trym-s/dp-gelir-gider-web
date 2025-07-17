import { api } from './api';

export const getExpenseReport = async (startDate, endDate, options = {}) => {
  try {
    const response = await api.get('/expense_report', {
      params: {
        start_date: startDate,
        end_date: endDate,
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
    const response = await api.get('/income_report', {
      params: {
        start_date: startDate,
        end_date: endDate,
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
  const response = await api.get('/expense_graph', {
    params: { start_date: startDate, end_date: endDate }
  });
  return response.data;
};

export const getExpenseDistributionData = async (startDate, endDate, groupBy) => {
  const response = await api.get('/expense_distribution', {
    params: { start_date: startDate, end_date: endDate, group_by: groupBy }
  });
  return response.data;
};

export const getIncomeGraphData = async (startDate, endDate) => {
  const response = await api.get('/income_graph', {
    params: { start_date: startDate, end_date: endDate }
  });
  return response.data;
};

export const getIncomeDistributionData = async (startDate, endDate, groupBy) => {
    const response = await api.get('/income_distribution', {
        params: { start_date: startDate, end_date: endDate, group_by: groupBy }
    });
    return response.data;
};

export const getCombinedIncomeExpenseData = async (startDate, endDate) => {
  const response = await api.get('/combined_income_expense_graph', {
    params: { start_date: startDate, end_date: endDate }
  });
  return response.data;
};