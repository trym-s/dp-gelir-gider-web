// src/api/bankService.js
import { api } from './api';

// Tüm bankaları getirme
export const getBanks = async () => {
  try {
    const response = await api.get('/bank/list');
    return response.data;
  } catch (error) {
    console.error("Bankalar getirilirken hata oluştu:", error);
    throw error;
  }
};

// Yeni banka oluşturma
export const createBank = async (bankData) => {
  try {
    const response = await api.post('/bank', bankData);
    return response.data;
  } catch (error) {
    console.error("Banka oluşturulurken hata oluştu:", error);
    throw error;
  }
};

// Toplu banka ekleme (isteğe bağlı)
export const createMultipleBanks = async (namesArray) => {
  try {
    const response = await api.post('/bank/bulk', { names: namesArray });
    return response.data;
  } catch (error) {
    console.error("Toplu banka eklenirken hata oluştu:", error);
    throw error;
  }
};

// Günlük sabah/akşam banka logu kaydetme
export const saveBankLogs = async (logs) => {
  try {
    const responses = await Promise.all(
      logs.map((log) => api.post('/bank/log', log))
    );
    return responses.map((res) => res.data);
  } catch (error) {
    console.error("Banka logları kaydedilirken hata oluştu:", error);
    throw error;
  }
};

export const getBankLogsByDate = async (date) => {
  try {
    const response = await api.get('/bank/logs', {
      params: { date },
    });
    return response.data; // BankLog listesi
  } catch (error) {
    console.error("Bank logları getirilirken hata oluştu:", error);
    throw error;
  }
};

export const deleteBank = async (bankId) => {
  try {
    const response = await api.delete(`/bank/${bankId}`);
    return response.data;
  } catch (error) {
    console.error("Banka silinirken hata oluştu:", error);
    throw error;
  }
};