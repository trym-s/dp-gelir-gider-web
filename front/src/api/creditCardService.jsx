import { api } from './api';

// --- Card Brand Services ---
export const getCardBrands = () => api.get('/card-brands');
export const createCardBrand = (brandData) => api.post('/card-brands', brandData);



// --- Credit Card Services ---
export const getCreditCards = async () => {
  try {
    const response = await api.get('/credit-cards');
    return response.data;
  } catch (error) {
    console.error("Error fetching credit cards:", error);
    throw error;
  }
};
export const getCreditCardById = (cardId) => api.get(`/credit-cards/${cardId}`);
export const createCreditCard = (cardData) => api.post('/credit-cards', cardData);
export const updateCreditCard = (cardId, cardData) => api.put(`/credit-cards/${cardId}`, cardData);

// --- Transaction Services ---
export const getTransactionsForCard = (cardId) => api.get(`/credit-cards/${cardId}/transactions`);
export const addTransactionToCard = (cardId, transactionData) => api.post(`/credit-cards/${cardId}/transactions`, transactionData);

export const getTransactionsByBillId = (billId) => api.get(`/credit-cards/transactions/by-bill/${billId}`);

export const getAllBilledTransactions = () => api.get('/credit-cards/transactions/billed');
 

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

// @SERPIL


/**
 * Pivot tablo için belirli bir aydaki günlük limit/kullanım verilerini getirir.
 * @param {number} year - Yıl (örn: 2025)
 * @param {number} month - Ay (1-12)
 */
export const getDailyLimitsForMonth = async (year, month) => {
  try {
    const response = await api.get(`/credit-cards/daily-limits/${year}/${month}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching daily limits for ${month}/${year}:`, error);
    throw error.response ? error.response.data : error;
  }
};

/**
 * Yeni günlük limit girişlerini (toplu) kaydeder.
 * @param {Array} entries - Kaydedilecek girişlerin listesi
 */
export const saveDailyLimits = async (entries) => {
  try {
    // Not: Bu endpoint backend'de henüz eklenmemiş olabilir, ihtiyaç halinde eklenmelidir.
    const response = await api.post('/credit-cards/daily-entries', entries);
    return response.data;
  } catch (error) {
    console.error("Error saving daily limit entries:", error);
    throw error.response ? error.response.data : error;
  }
};


export const getStatusHistoryForCreditCard = async (creditCardId) => {
  try {
    // Parametreleri backend'in beklediği şekilde oluşturuyoruz.
    const params = {
      subject_type: 'credit_card', // Artık hangi model için durum istediğimizi belirtiyoruz.
      subject_id: creditCardId
    };
    
    // Banka hesabı ile aynı merkezi endpoint'i kullanıyoruz.
    const response = await api.get('/bank_status/status-history/', { params });
    return response.data;
    
  } catch (error) {
    // Hata durumunda daha anlaşılır bir log mesajı veriyoruz.
    console.error(`Kredi kartı ID ${creditCardId} için durum geçmişi alınırken hata:`, error);
    throw error;
  }
};

export const saveCreditCardStatus = async (statusData) => {
  try {
    // Component'in 'statusData' objesine 'subject_type: "credit_card"' eklediğinden
    // zaten eminiz. Endpoint'in de doğru olduğunu kontrol ediyoruz.
    const response = await api.post('/bank_status/status-history/', statusData);
    return response.data;
  } catch (error) {
    // Hata mesajını daha detaylı logluyoruz.
    console.error('Kredi kartı durumu kaydedilirken hata oluştu:', error);
    throw error;
  }
};
