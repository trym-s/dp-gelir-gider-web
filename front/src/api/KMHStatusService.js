// front/src/api/kmhService.js

import { api } from './api'; // Projenizdeki yapılandırılmış axios instance'ı

/**
 * KMH sayfasındaki kartları doldurmak için tüm KMH limitlerini getirir.
 */
export const getKmhAccounts = async () => {
  try {
    // DEĞİŞİKLİK: Endpoint güncellendi.
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

/**
 * Belirli bir KMH limitinin durum geçmişini getirir.
 * @param {number} kmhLimitId - Durum geçmişi alınacak KMH limitinin ID'si
 */
export const getStatusHistoryForKmh = async (kmhLimitId) => {
  try {
    const params = {
      subject_type: 'kmh_limit', // Model tipini belirtiyoruz
      subject_id: kmhLimitId
    };
    const response = await api.get('/status-history/', { params });
    return response.data;
  } catch (error) {
    console.error(`Error fetching status history for KMH limit ${kmhLimitId}:`, error);
    throw error.response ? error.response.data : error;
  }
};

/**
 * Bir KMH limiti için yeni bir durum kaydeder.
 * @param {object} statusData - { subject_id, subject_type: 'kmh_limit', status, start_date, ... }
 */
export const saveKmhStatus = async (statusData) => {
  try {
    const response = await api.post('/status-history/', { ...statusData, subject_type: 'kmh_limit' });
    return response.data;
  } catch (error) {
    console.error('Error saving new KMH status:', error);
    throw error.response ? error.response.data : error;
  }
};
