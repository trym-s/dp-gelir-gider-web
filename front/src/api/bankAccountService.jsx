import { api } from './api';

// --- Bank Account Services ---
export const getBankAccounts = () => api.get('/bank-accounts');
export const createBankAccount = (accountData) => api.post('/bank-accounts', accountData);
export const getBankAccountById = (accountId) => api.get(`/bank-accounts/${accountId}`);
export const updateBankAccount = (accountId, accountData) => api.put(`/bank-accounts/${accountId}`, accountData);
export const deleteBankAccount = (accountId) => api.delete(`/bank-accounts/${accountId}`);

// --- Sonradan eklenen servisler ---

/**
 * Sistemdeki tüm hesapları banka adı ve mevcut durum (status) bilgisiyle birlikte getirir.
 * BankStatusPage gibi özel bileşenler için kullanılır.
 * @returns {Promise<Array>} Hesap listesi.
 */
export const getAccountsWithStatus = async () => {
  try {
    const response = await api.get('/bank_status/accounts-with-status');
    return response.data;
  } catch (error) {
    console.error("Hesaplar ve durumları getirilirken hata oluştu:", error);
    throw error;
  }
};

/**
 * Belirli bir banka ve hesaba ait tüm bakiye geçmişini getirir.
 * @param {string} bankName - Bankanın adı.
 * @param {string} accountName - Hesabın adı.
 * @returns {Promise<Array>} Bakiye geçmişi listesi.
 */
export const getBalanceHistoryForAccount = async (bankName, accountName) => {
  try {
    const response = await api.get('/bank_status/balance_history', {
      params: {
        bank_name: bankName,
        account_name: accountName
      }
    });
    return response.data;
  } catch (error) {
    console.error(`'${bankName} - ${accountName}' için bakiye geçmişi alınırken hata:`, error);
    throw error;
  }
};