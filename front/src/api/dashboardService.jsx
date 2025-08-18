import { api } from './api';

/** Accepts either an array or { data: [...] } and returns the array. */
const toArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
};

/* -------------------- Reports (object döner) -------------------- */

export const getExpenseReport = async (startDate, endDate, options = {}) => {
  try {
    const response = await api.get('/expense_report', {
      params: {
        start_date: startDate,
        end_date: endDate,
        group_by: options.groupBy,
        group_name: options.groupName,
      },
      signal: options.signal,
    });
    // { timeframe, summary, details }
    return response.data;
  } catch (error) {
    console.error('Gider raporu alınırken hata:', error);
    throw error;
  }
};

export const getIncomeReport = async (startDate, endDate, options = {}) => {
  try {
    const response = await api.get('/income_report', {
      params: {
        start_date: startDate,
        end_date: endDate,
        group_by: options.groupBy,
        group_name: options.groupName,
      },
      signal: options.signal,
    });
    // { timeframe, summary, details }
    return response.data;
  } catch (error) {
    console.error('Gelir raporu alınırken hata:', error);
    throw error;
  }
};

/* -------------------- Graphs & Distributions (array döner) -------------------- */

export const getExpenseGraphData = async (startDate, endDate) => {
  const response = await api.get('/expense_graph', {
    params: { start_date: startDate, end_date: endDate },
  });
  return toArray(response.data); // [{ date, paid, remaining }, ...]
};

export const getExpenseDistributionData = async (startDate, endDate, groupBy) => {
  const response = await api.get('/expense_distribution', {
    params: { start_date: startDate, end_date: endDate, group_by: groupBy },
  });
  return toArray(response.data); // [{ name, paid, remaining }, ...]
};

export const getIncomeGraphData = async (startDate, endDate) => {
  const response = await api.get('/income_graph', {
    params: { start_date: startDate, end_date: endDate },
  });
  return toArray(response.data); // [{ date, received, remaining }, ...]
};

export const getIncomeDistributionData = async (startDate, endDate, groupBy) => {
  const response = await api.get('/income_distribution', {
    params: { start_date: startDate, end_date: endDate, group_by: groupBy },
  });
  return toArray(response.data); // [{ name, received, remaining }, ...]
};

export const getCombinedIncomeExpenseData = async (startDate, endDate) => {
  const response = await api.get('/combined_income_expense_graph', {
    params: { start_date: startDate, end_date: endDate },
  });
  return toArray(response.data); // [{ date, income, expense, difference }, ...]
};

/* -------------------- Other -------------------- */

export const getDailyCreditLimitChartData = async (bankId) => {
  try {
    const response = await api.get(`/dashboard/charts/daily-credit-limit/${bankId}`);
    // Eğer backend burada da {data: [...]} döndürüyorsa aşağıyı aç:
    // return toArray(response.data);
    return response.data;
  } catch (error) {
    console.error('Daily credit limit chart data alınırken hata:', error);
    throw error;
  }
};

/* (Opsiyonel) Hepsini tek obje olarak da dışa açmak istersen: */
// export default {
//   getExpenseReport,
//   getIncomeReport,
//   getExpenseGraphData,
//   getExpenseDistributionData,
//   getIncomeGraphData,
//   getIncomeDistributionData,
//   getCombinedIncomeExpenseData,
//   getDailyCreditLimitChartData,
// };

