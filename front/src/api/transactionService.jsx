// src/api/transactionService.jsx

import { api } from './api';

/**
 * Birleşik işlemleri (gelir, gider, kredi vb.) backend'den çeken servis fonksiyonu.
 * Filtreleme, sıralama ve sayfalama parametrelerini destekler.
 * @param {object} params - Backend'e gönderilecek query parametreleri.
 * Örn: { page: 1, per_page: 20, startDate: '2025-01-01', q: 'kira' }
 * @returns {Promise<object>} - 'data' ve 'pagination' anahtarlarını içeren bir obje döner.
 */
export const getTransactions = async (params = {}) => {
  try {
    const response = await api.get('/transactions', { params });
    return response.data; 
  } catch (error) {
    console.error("Birleşik işlemler getirilirken hata oluştu:", error);
    // Hata durumunda, çağıran bileşenin bunu yakalayabilmesi için hatayı tekrar fırlat.
    throw error;
  }
};

/**
 * Birleşik GÜNLÜK GİRİŞLERİ (bakiye, kmh, limit) backend'den çeker.
 * @param {object} params - Backend'e gönderilecek query parametreleri.
 * @returns {Promise<object>} - 'data' ve 'pagination' içeren bir obje döner.
 */
export const getDailyEntries = async (params = {}) => {
  try {
    // Backend'de oluşturduğumuz yeni rotaya istek atıyoruz
    const response = await api.get('/transactions/daily-entries', { params });
    return response.data;
  } catch (error) {
    console.error("Günlük girişler getirilirken hata oluştu:", error);
    throw error;
  }
};