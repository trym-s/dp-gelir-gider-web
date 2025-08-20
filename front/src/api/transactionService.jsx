import { api } from './api';

// --- YENİ BİRLEŞİK FONKSİYONLAR ---

/**
 * Ana sayfa için son 5 birleşik olayı backend'den çeker.
 */
export const getRecentActivities = async () => {
  try {
    // Backend'de oluşturduğumuz yeni ve özel rotayı çağırır.
    const response = await api.get('/transactions/recent-activities');
    return response.data;
  } catch (error) {
    console.error("Son olaylar getirilirken hata oluştu:", error);
    throw error;
  }
};

/**
 * Tüm birleşik olay akışını (gelir, gider, kredi vb. ekleme) backend'den çeker.
 * Filtreleme ve sayfalama parametrelerini destekler.
 */
export const getAllActivities = async (params = {}) => {
  try {
    // "Tümünü Gör" sayfası için oluşturduğumuz yeni ve sayfalanabilir rotayı çağırır.
    const response = await api.get('/transactions/activities', { params });
    return response.data;
  } catch (error) {
    console.error("Tüm olay akışı getirilirken hata oluştu:", error);
    throw error;
  }
};
/**
 * Ana sayfa için 3 kaynaktan birleştirilmiş özel akışı çeker.
 */
export const getDashboardFeed = async () => {
  try {
    const response = await api.get('/transactions/dashboard-feed');
    return response.data;
  } catch (error) {
    console.error("Ana sayfa akışı getirilirken hata oluştu:", error);
    throw error;
  }
};

// --- ESKİ FONKSİYONLAR (Yeni yapıya geçince bunlara ihtiyaç kalmayacak) ---

export const getTransactions = async (params = {}) => {
  try {
    const response = await api.get('/transactions', { params });
    return response.data; 
  } catch (error) {
    console.error("Eski birleşik işlemler getirilirken hata oluştu:", error);
    throw error;
  }
};

export const getDailyEntries = async (params = {}) => {
  try {
    const response = await api.get('/transactions/daily-entries', { params });
    return response.data;
  } catch (error) {
    console.error("Günlük girişler getirilirken hata oluştu:", error);
    throw error;
  }
};