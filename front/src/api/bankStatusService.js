// front/src/api/bankStatusService.js
//cari durumlar için.
import { api } from './api'; // Merkezi API instance'ınızı import edin

// Bu fonksiyon artık '/api/bank/list' endpoint'ini çağırıyor.
export const getBanks = async () => {
  try {
    // DEĞİŞİKLİK: Endpoint güncellendi.
    const response = await api.get('/bank/list');
    return response.data;
  } catch (error) {
    console.error("Bankalar getirilirken hata oluştu:", error);
    throw error;
  }
};

// Bu fonksiyon artık vadesiz hesapları yöneten '/api/accounts/' endpoint'ini çağırıyor.
export const getAccounts = async (date = null) => {
  try {
    const params = {};
    if (date) {
      params.date = date.format('YYYY-MM-DD');
    }
    // DEĞİŞİKLİK: Endpoint güncellendi.
    const response = await api.get('/accounts/', { params });
    return response.data;
  } catch (error) {
    console.error("Hesaplar getirilirken hata oluştu:", error);
    throw error;
  }
};

// Bu fonksiyon artık '/api/accounts/daily-balances/...' endpoint'ini çağırıyor.
export const getDailyBalances = async (year, month) => {
  try {
    // DEĞİŞİKLİK: Endpoint güncellendi.
    const response = await api.get(`/accounts/daily-balances/${year}/${month}`);
    return response.data;
  } catch (error) {
    console.error(`Günlük bakiyeler (${month}/${year}) getirilirken hata oluştu:`, error);
    throw error;
  }
};

// Bu fonksiyon artık '/api/accounts/daily-entries' endpoint'ini çağırıyor.
export const saveDailyEntries = async (entriesData) => {
  try {
    // DEĞİŞİKLİK: Endpoint güncellendi.
    const response = await api.post('/accounts/daily-entries', entriesData);
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

// Bu fonksiyon artık '/api/accounts/' endpoint'ine POST isteği atıyor.
export const createAccount = async (accountData) => {
  try {
    // DEĞİŞİKLİK: Endpoint güncellendi.
    const response = await api.post('/accounts/', accountData);
    return response.data;
  } catch (error) {
    console.error("Hesap oluşturulurken hata oluştu:", error);
    if (error.response) {
      throw new Error(error.response.data.message || "Hesap oluşturulurken bilinmeyen bir hata oluştu.");
    }
    throw error;
  }
};

// Bu fonksiyon artık merkezi '/api/status-history/' endpoint'ini çağırıyor.
export const getStatusHistoryForAccount = async (accountId) => {
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

// Bu fonksiyon artık merkezi '/api/status-history/' endpoint'ine POST isteği atıyor.
export const saveAccountStatus = async (statusData) => {
  try {
    // ÖNEMLİ NOT: Bu fonksiyonu çağıran component'in, gönderilen 'statusData'
    // objesine { subject_type: 'account', subject_id: HESAP_ID, ... }
    // alanlarını eklediğinden emin olun.
    
    // DEĞİŞİKLİK: Endpoint güncellendi.
    const response = await api.post('/status-history/', statusData);
    return response.data;
  } catch (error) {
    console.error('Yeni durum kaydedilirken hata:', error);
    throw error;
  }
};
