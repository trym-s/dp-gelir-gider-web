// src/api/dashboardService.js
import axios from 'axios';

export const getDailyCreditLimitChartData = (bankId) => {
  return axios.get(`/api/dashboard/charts/daily-credit-limit/${bankId}`);
};
