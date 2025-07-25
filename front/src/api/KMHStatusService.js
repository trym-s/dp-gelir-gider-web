import { api } from './api'; // Projenizdeki yapılandırılmış axios instance'ı

/**
 * KMH sayfasındaki kartları doldurmak için tüm KMH hesaplarını getirir.
 */
export const getKmhAccounts = async () => {
  try {
    const response = await api.get('/kmh_status/accounts');
    return response.data;
  } catch (error) {
    console.error("Error fetching KMH accounts:", error);
    // Hata detayını daha iyi görmek için
    throw error.response ? error.response.data : error;
  }
};

/**
 * Pivot tablo için belirli bir aydaki günlük riskleri getirir.
 * @param {number} year - Yıl (örn: 2025)
 * @param {number} month - Ay (1-12)
 */
export const getDailyRisksForMonth = async (year, month) => {
  try {
    const response = await api.get(`/kmh_status/daily_risks/${year}/${month}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching daily risks for ${month}/${year}:`, error);
    throw error.response ? error.response.data : error;
  }
};

/**
 * Yeni günlük risk girişlerini (toplu) kaydeder.
 * @param {Array} entries - Kaydedilecek girişlerin listesi
 */
export const saveDailyEntries = async (entries) => {
  try {
    const response = await api.post('/kmh_status/daily_entries', entries);
    return response.data;
  } catch (error) {
    console.error("Error saving daily risk entries:", error);
    throw error.response ? error.response.data : error;
  }
};
