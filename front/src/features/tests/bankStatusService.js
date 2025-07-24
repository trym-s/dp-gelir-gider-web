// front/src/api/bankStatusService.js

import { api } from './api'; // Merkezi API instance'ınızı import edin

/**
 * Sistemdeki tüm bankaları getirir.
 * @returns {Promise<Array>} Banka listesi.
 */
export const getBanks = async () => {
  try {
    const response = await api.get('/bank_status/banks');
    return response.data;
  } catch (error) {
    console.error("Bankalar getirilirken hata oluştu:", error);
    throw error;
  }
};

/**
 * Sistemdeki tüm hesapları getirir (banka bilgileriyle birlikte).
 * @returns {Promise<Array>} Hesap listesi.
 */
export const getAccounts = async () => {
  try {
    const response = await api.get('/bank_status/accounts');
    return response.data;
  } catch (error) {
    console.error("Hesaplar getirilirken hata oluştu:", error);
    throw error;
  }
};

/**
 * Belirli bir ay ve yıla ait günlük bakiye kayıtlarını getirir (pivot tablo için).
 * @param {number} year - Yıl (örn: 2025).
 * @param {number} month - Ay (örn: 7).
 * @returns {Promise<Array>} Günlük bakiye kayıtlarının listesi.
 */
export const getDailyBalances = async (year, month) => {
  try {
    const response = await api.get(`/bank_status/daily_balances/${year}/${month}`);
    return response.data;
  } catch (error) {
    console.error(`Günlük bakiyeler (${month}/${year}) getirilirken hata oluştu:`, error);
    throw error;
  }
};

/**
 * Günlük bakiye girişlerini (toplu) kaydeder veya günceller. Gap kapatma mantığını tetikler.
 * @param {Array<Object>} entriesData - Kaydedilecek günlük bakiye girişlerinin listesi.
 * Her obje: { banka: string, hesap: string, tarih: string (YYYY-MM-DD), sabah: number, aksam: number }
 * @returns {Promise<Object>} Backend'den dönen yanıt (örn: { message: "..." }).
 */
export const saveDailyEntries = async (entriesData) => {
  try {
    const response = await api.post('/bank_status/daily_entries', entriesData);
    return response.data;
  } catch (error) {
    console.error("Günlük girişler kaydedilirken hata oluştu:", error);
    // Hatanın detaylarını daha iyi yakalamak için
    if (error.response) {
      // Backend bir yanıt döndürdüyse (örn: 400, 500)
      console.error("Backend yanıt hatası:", error.response.data);
      console.error("Status:", error.response.status);
      throw new Error(error.response.data.message || "Backend'den bilinmeyen bir hata oluştu.");
    } else if (error.request) {
      // İstek gönderildi ancak yanıt alınamadı (örn: ağ hatası)
      console.error("Ağ hatası: Sunucuya ulaşılamadı.");
      throw new Error("Sunucuya ulaşılamadı. Ağ bağlantınızı kontrol edin.");
    } else {
      // Diğer hatalar
      console.error("İstek yapılandırılırken hata:", error.message);
      throw new Error("İstek yapılandırılırken bir hata oluştu.");
    }
  }
};

/**
 * Yeni bir banka hesabı oluşturur. (Opsiyonel API, backend'de tanımlıydı)
 * @param {Object} accountData - Oluşturulacak hesabın verileri.
 * @returns {Promise<Object>} Oluşturulan hesabın bilgileri.
 */
export const createAccount = async (accountData) => {
  try {
    const response = await api.post('/bank_status/account', accountData);
    return response.data;
  } catch (error) {
    console.error("Hesap oluşturulurken hata oluştu:", error);
    if (error.response) {
      throw new Error(error.response.data.message || "Hesap oluşturulurken bilinmeyen bir hata oluştu.");
    }
    throw error;
  }
};

// YENİ FONKSİYON 1: Belirli bir hesabın durum geçmişini getirir
export const getStatusHistoryForAccount = async (accountId) => {
  try {
    // Backend'de oluşturduğumuz yeni endpoint'i çağırıyoruz
    const response = await api.get(`/bank_status/accounts/${accountId}/status-history`);
    return response.data;
  } catch (error) {
    console.error(`Hesap ${accountId} için durum geçmişi alınırken hata:`, error);
    throw error;
  }
};

// YENİ FONKSİYON 2: Yeni bir hesap durumu kaydeder
export const saveAccountStatus = async (statusData) => {
  try {
    // Backend'de oluşturduğumuz yeni endpoint'e POST isteği atıyoruz
    const response = await api.post('/bank_status/accounts/status-history', statusData);
    return response.data;
  } catch (error) {
    console.error('Yeni durum kaydedilirken hata:', error);
    throw error;
  }
};