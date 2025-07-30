import { api } from './api';

export const getDailyBalances = (year, month) => {
  return api.get(`/bank_status/daily_balances/${year}/${month}`);
};

export const saveDailyEntries = (entries) => {
  return api.post('/bank_status/daily_entries', entries);
};

export const createBankAccount = (accountData) => {
  return api.post('/bank_status/bank-account', accountData);
};

export const getStatusHistoryForBankAccount = (accountId) => {
  return api.get(`/bank_status/bank-accounts/${accountId}/status-history`);
};

export const saveBankAccountStatus = (statusData) => {
  return api.post('/bank_status/bank-accounts/status-history', statusData);
};