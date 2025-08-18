// /front/src/api/bankLogService.jsx
import { api } from './api';

/**
 * Fetches all bank balances for a given date and period.
 * @param {string} date - The date in 'YYYY-MM-DD' format.
 * @param {string} period - 'morning' or 'evening'.
 * @returns {Promise<Array>} - A promise that resolves to an array of bank log objects.
 */
export const fetchBalances = (date, period) => {
  return api.get('/bank-logs/by-period', {
    params: { date, period },
  });
};

/**
 * Creates or updates a bank balance log.
 * @param {object} balanceData - The data for the log.
 * @returns {Promise<object>} - A promise that resolves to the updated/created log object.
 */
export const updateBalance = (balanceData) => {
  const { id, ...payload } = balanceData;
  return api.post('/bank-logs/upsert', payload);
};

/**
 * Creates or updates a list of bank logs in a single transaction.
 * @param {Array<object>} balancesData - The list of log data to update.
 * @returns {Promise<Array<object>>} - A promise that resolves to the list of updated logs.
 */
export const batchUpdateBalances = (balancesData) => {
  return api.post('/bank-logs/batch-upsert', balancesData);
};
export const exportBalancesToExcel = (date) => {
  return api.get('/bank-logs/export-excel', {
    params: { date },
    responseType: 'blob', // ÖNEMLİ: Sunucudan dosya (binary data) beklendiğini belirtir
  });
};
