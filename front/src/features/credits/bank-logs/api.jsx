// /front/src/features/credits/bank-logs/api.jsx
import axios from 'axios';

const BANK_LOGS_API_URL = '/api/bank-logs';
const BANKS_API_URL = '/api/banks'; // Endpoint for managing banks

export const api = {
  /**
   * Fetches all bank balances for a given date and period.
   * @param {string} date - The date in 'YYYY-MM-DD' format.
   * @param {string} period - 'morning' or 'evening'.
   * @returns {Promise<Array>} - A promise that resolves to an array of bank log objects.
   */
  fetchBalances: async (date, period) => {
    try {
      const response = await axios.get(`${BANK_LOGS_API_URL}/by-period`, {
        params: { date, period },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching bank balances:', error);
      throw error;
    }
  },

  /**
   * Creates or updates a bank balance log.
   * @param {object} balanceData - The data for the log.
   * @returns {Promise<object>} - A promise that resolves to the updated/created log object.
   */
  updateBalance: async (balanceData) => {
    try {
      const { id, ...payload } = balanceData;
      const response = await axios.post(`${BANK_LOGS_API_URL}/upsert`, payload);
      return response.data;
    } catch (error) {
      console.error('Error updating bank balance:', error);
      throw error;
    }
  },

  /**
   * Adds a new bank to the database.
   * @param {object} bankData - The data for the new bank, e.g., { name: 'New Bank' }.
   * @returns {Promise<object>} - A promise that resolves to the newly created bank object.
   */
  addBank: async (bankData) => {
    try {
      const response = await axios.post(BANKS_API_URL, bankData);
      return response.data;
    } catch (error) {
      console.error('Error adding new bank:', error);
      throw error;
    }
  },
};
