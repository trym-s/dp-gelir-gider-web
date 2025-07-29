// front/src/api/creditCardService.js

import { api } from './api'; // Projenizdeki yapılandırılmış axios instance'ı

/**
 * Tüm kredi kartlarını ve detaylarını getirir.
 */
export const getCreditCards = async () => {
  try {
    const response = await api.get('/credit-cards/');
    return response.data;
  } catch (error) {
    console.error("Error fetching credit cards:", error);
    throw error.response ? error.response.data : error;
  }
};

/**
 * Yeni bir kredi kartı oluşturur.
 * @param {object} cardData - Oluşturulacak kredi kartı verileri
 */
export const createCreditCard = async (cardData) => {
  try {
    const response = await api.post('/credit-cards/', cardData);
    return response.data;
  } catch (error) {
    console.error("Error creating credit card:", error);
    throw error.response ? error.response.data : error;
  }
};

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

/**
 * Sistemdeki tüm kart markalarını (Visa, Mastercard vb.) listeler.
 */
export const getCardBrands = async () => {
  try {
    const response = await api.get('/credit-cards/brands');
    return response.data;
  } catch (error) {
    console.error("Error fetching card brands:", error);
    throw error.response ? error.response.data : error;
  }
};

/**
 * Yeni bir kart markası oluşturur.
 * @param {{name: string}} brandData - Oluşturulacak marka verisi
 */
export const createCardBrand = async (brandData) => {
  try {
    const response = await api.post('/credit-cards/brands', brandData);
    return response.data;
  } catch (error) {
    console.error("Error creating card brand:", error);
    throw error.response ? error.response.data : error;
  }
};

/**
 * Belirli bir kredi kartının durum geçmişini getirir.
 * @param {number} cardId - Durum geçmişi alınacak kartın ID'si
 */
export const getStatusHistoryForCard = async (cardId) => {
  try {
    const params = {
      subject_type: 'credit_card', // Model tipini belirtiyoruz
      subject_id: cardId
    };
    const response = await api.get('/status-history/', { params });
    return response.data;
  } catch (error) {
    console.error(`Error fetching status history for credit card ${cardId}:`, error);
    throw error.response ? error.response.data : error;
  }
};

/**
 * Bir kredi kartı için yeni bir durum kaydeder.
 * @param {object} statusData - { subject_id, status, start_date, ... }
 */
export const saveCardStatus = async (statusData) => {
  try {
    const response = await api.post('/status-history/', { ...statusData, subject_type: 'credit_card' });
    return response.data;
  } catch (error)
  {
    console.error('Error saving new card status:', error);
    throw error.response ? error.response.data : error;
  }
};
