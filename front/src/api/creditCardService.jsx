import { api } from './api';

// --- Card Brand Services ---
export const getCardBrands = () => api.get('/card-brands');
export const createCardBrand = (brandData) => api.post('/card-brands', brandData);

// --- Bank Account Services ---
export const getBankAccounts = () => api.get('/bank-accounts');
export const createBankAccount = (accountData) => api.post('/bank-accounts', accountData);

// --- Credit Card Services ---
export const getCreditCards = () => api.get('/credit-cards');
export const getCreditCardById = (cardId) => api.get(`/credit-cards/${cardId}`);
export const createCreditCard = (cardData) => api.post('/credit-cards', cardData);
export const updateCreditCard = (cardId, cardData) => api.put(`/credit-cards/${cardId}`, cardData);

// --- Transaction Services ---
export const getTransactionsForCard = (cardId) => api.get(`/credit-cards/${cardId}/transactions`);
export const addTransactionToCard = (cardId, transactionData) => api.post(`/credit-cards/${cardId}/transactions`, transactionData);
 

export const importTransactionsForCard = async (cardId, transactions) => {
  // Idempotency anahtarını her farklı içe aktarma işlemi için benzersiz üretiyoruz.
  const idempotencyKey = crypto.randomUUID();

  // API'nin beklediği payload yapısını oluşturuyoruz.
  const payload = {
    transactions: transactions
  };

  try {
    const response = await api.post(
      `/credit-cards/${cardId}/transactions/bulk`, 
      payload, 
      {
        headers: {
          'Idempotency-Key': idempotencyKey
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Kredi kartı #${cardId} için harcama aktarma hatası:`, error.response?.data || error.message);
    // Hatanın bileşen tarafından yakalanıp kullanıcıya gösterilmesi için yeniden fırlatıyoruz.
    throw error;
  }
};