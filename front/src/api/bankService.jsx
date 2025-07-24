import { api } from './api';

// --- Bank Services ---
export const getBanks = () => api.get('/banks');
export const createBank = (bankData) => api.post('/banks', bankData);
export const updateBank = (bankId, bankData) => api.put(`/banks/${bankId}`, bankData);
export const deleteBank = (bankId) => api.delete(`/banks/${bankId}`);
export const getBankSummary = (bankId) => api.get(`/banks/${bankId}/summary`);


// --- Dashboard Service ---
export const getBanksWithAccounts = () => {
  return api.get('/dashboard/banks-with-accounts');
};
