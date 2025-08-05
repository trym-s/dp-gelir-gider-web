import { api } from './api';

// --- Bank Services ---
export const getBanks = () => api.get('/banks');
export const createBank = (bankData) => api.post('/banks', bankData);
export const updateBank = (bankId, bankData) => api.put(`/banks/${bankId}`, bankData);
export const deleteBank = (bankId) => api.delete(`/banks/${bankId}`);
export const getBankSummary = (bankId, bankAccountId) => {
  let url = `/banks/${bankId}/summary`;
  if (bankAccountId) {
    url += `?bank_account_id=${bankAccountId}`;
  }
  return api.get(url);
};


// --- Dashboard Service ---
export const getBanksWithAccounts = () => api.get('/dashboard/banks-with-accounts');
export const getCreditCardsWithBanks = () => api.get('/dashboard/credit-cards-by-bank');
export const getLoanSummaryByBank = () => api.get('/dashboard/loan-summary-by-bank');
export const getCreditCardSummaryByBank = () => api.get('/dashboard/credit-card-summary-by-bank');

// --- Chart Services ---
export const getDailyRiskChartData = (bankId) => api.get(`/dashboard/charts/daily-risk/${bankId}`);
