// front/src/api/kmhService.js

import { api } from './api'; // Projenizdeki yapılandırılmış axios instance'ı

/**
 * KMH sayfasındaki kartları doldurmak için tüm KMH limitlerini getirir.
 */
export const getKmhAccounts = async () => {
  try {
    const response = await api.get('/kmh/');
    return response.data;
  } catch (error) {
    console.error("Error fetching KMH accounts:", error);
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
    // DEĞİŞİKLİK: Endpoint güncellendi.
    const response = await api.get(`/kmh/daily-risks/${year}/${month}`);
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
    // DEĞİŞİKLİK: Endpoint güncellendi.
    const response = await api.post('/kmh/daily-entries', entries);
    return response.data;
  } catch (error) {
    console.error("Error saving daily risk entries:", error);
    throw error.response ? error.response.data : error;
  }
};

// ## YENİ EKLENEN FONKSİYONLAR ##

/**
 * Yeni bir KMH Limiti tanımı oluşturur.
 * @param {object} kmhData - Oluşturulacak KMH verileri
 */
export const createKmhLimit = async (kmhData) => {
  try {
    const response = await api.post('/kmh/', kmhData);
    return response.data;
  } catch (error) {
    console.error("Error creating KMH limit:", error);
    throw error.response ? error.response.data : error;
  }
};

export const updateKmhAccount = async (kmhId, kmhData) => {
  try {
    const response = await api.put(`/kmh/${kmhId}`, kmhData);
    return response.data;
  } catch (error) {
    console.error(`Error updating KMH account ${kmhId}:`, error);
    throw error.response ? error.response.data : error;
  }
};

export const deleteKmhLimit = async (id) => {
  const { data } = await api.delete(`/kmh/${id}`);
  return data;
};

