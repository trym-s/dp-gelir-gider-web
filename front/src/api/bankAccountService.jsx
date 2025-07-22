import { api } from './api';

// --- Bank Account Services ---
export const getBankAccounts = () => api.get('/bank-accounts');
export const createBankAccount = (accountData) => api.post('/bank-accounts', accountData);
export const getBankAccountById = (accountId) => api.get(`/bank-accounts/${accountId}`);
export const updateBankAccount = (accountId, accountData) => api.put(`/bank-accounts/${accountId}`, accountData);
export const deleteBankAccount = (accountId) => api.delete(`/bank-accounts/${accountId}`);
