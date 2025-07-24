import { api } from './api';

export const getDailyBalances = (year, month) => {
  return api.get(`/bank_status/daily_balances/${year}/${month}`);
};

export const saveDailyEntries = (entries) => {
  return api.post('/bank_status/daily_entries', entries);
};

export const createAccount = (accountData) => {
  return api.post('/bank_status/account', accountData);
};

export const getStatusHistoryForAccount = (accountId) => {
  return api.get(`/bank_status/accounts/${accountId}/status-history`);
};

export const saveAccountStatus = (statusData) => {
  return api.post('/bank_status/accounts/status-history', statusData);
};