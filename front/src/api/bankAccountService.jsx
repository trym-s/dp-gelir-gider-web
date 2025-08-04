import { api } from './api';

// --- Bank Account Services ---
export const getBankAccounts = () => api.get('/bank-accounts');
export const createBankAccount = (accountData) => api.post('/bank-accounts', accountData);
export const getBankAccountById = (accountId) => api.get(`/bank-accounts/${accountId}`);
export const updateBankAccount = (accountId, accountData) => api.put(`/bank-accounts/${accountId}`, accountData);
export const deleteBankAccount = (accountId) => api.delete(`/bank-accounts/${accountId}`);

export const getBankAccountsWithStatus = async () => {
  try {
    const response = await api.get('/bank_status/accounts-with-status');
    return response.data;
  } catch (error) {
    console.error("Hesaplar ve durumları getirilirken hata oluştu:", error);
    throw error;
  }
};


export const getBalanceHistoryForBankAccount = async (bankName, accountName) => {
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


// @SERPIL

export const getDailyBalances = async (year, month) => {
  try {
    // HATA DÜZELTİLDİ: Endpoint'in doğru prefix'i kullandığından emin olundu.
    const response = await api.get(`/bank_status/daily_balances/${year}/${month}`);
    return response.data;
  } catch (error) {
    console.error(`Günlük bakiyeler (${month}/${year}) getirilirken hata oluştu:`, error);
    throw error;
  }
};

// Bu fonksiyon artık merkezi '/api/status-history/' endpoint'ini çağırıyor.
export const getStatusHistoryForBankAccount = async (accountId) => {
  try {
    // DEĞİŞİKLİK: Endpoint ve parametre yapısı tamamen değişti.
    const params = {
      subject_type: 'account', // Artık hangi model için durum istediğimizi belirtiyoruz.
      subject_id: accountId
    };
    const response = await api.get('/status-history/', { params });
    return response.data;
  } catch (error) {
    console.error(`Hesap ${accountId} için durum geçmişi alınırken hata:`, error);
    throw error;
  }
};

export const saveBankAccountStatus = async (statusData) => {
  try {
    // ÖNEMLİ NOT: Bu fonksiyonu çağıran component'in, gönderilen 'statusData'
    // objesine { subject_type: 'account', subject_id: HESAP_ID, ... }
    // alanlarını eklediğinden emin olun.
    
    // DEĞİŞİKLİK: Endpoint güncellendi.
    const response = await api.post('/bank_status/status-history/', statusData);
    return response.data;
  } catch (error) {
    console.error('Yeni durum kaydedilirken hata:', error);
    throw error;
  }
};



export const saveDailyEntries = async (entriesData) => {
  try {
    // HATA DÜZELTİLDİ: Bu endpoint de yanlış prefix'i kullanıyordu.
    const response = await api.post('/bank_status/daily_entries', entriesData);
    return response.data;
  } catch (error) {
    console.error("Günlük girişler kaydedilirken hata oluştu:", error);
    if (error.response) {
      console.error("Backend yanıt hatası:", error.response.data);
      throw new Error(error.response.data.message || "Backend'den bilinmeyen bir hata oluştu.");
    } else if (error.request) {
      console.error("Ağ hatası: Sunucuya ulaşılamadı.");
      throw new Error("Sunucuya ulaşılamadı. Ağ bağlantınızı kontrol edin.");
    } else {
      console.error("İstek yapılandırılırken hata:", error.message);
      throw new Error("İstek yapılandırılırken bir hata oluştu.");
    }
  }
};