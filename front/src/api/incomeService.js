import { api } from './api';

// Tüm gelirleri filtreleme, sıralama ve sayfalama ile getiren fonksiyon
export const getIncomes = async (params = {}) => {
  try {
    const response = await api.get('/incomes', { params });
    return response.data;
  } catch (error) {
    console.error("Gelirler getirilirken hata oluştu:", error);
    throw error;
  }
};

// ID ile tek bir gelir getiren fonksiyon
export const getIncomeById = async (id) => {
  try {
    const response = await api.get(`/incomes/${id}`);
    return response.data;
  } catch (error) {
    console.error(`ID'si ${id} olan gelir getirilirken hata oluştu:`, error);
    throw error;
  }
};

// Yeni bir gelir oluşturan fonksiyon
export const createIncome = async (incomeData) => {
  try {
    const response = await api.post('/incomes', incomeData);
    return response.data;
  } catch (error) {
    console.error("Gelir oluşturulurken hata oluştu:", error);
    throw error;
  }
};

// Mevcut bir geliri güncelleyen fonksiyon
export const updateIncome = async (id, incomeData) => {
  try {
    const response = await api.put(`/incomes/${id}`, incomeData);
    return response.data;
  } catch (error) {
    console.error(`ID'si ${id} olan gelir güncellenirken hata oluştu:`, error);
    throw error;
  }
};

// Bir geliri silen fonksiyon
export const deleteIncome = async (id) => {
  try {
    const response = await api.delete(`/incomes/${id}`);
    return response.data;
  } catch (error) {
    console.error(`ID'si ${id} olan gelir silinirken hata oluştu:`, error);
    throw error;
  }
};

// Tekrarlı gelir grubu oluşturan fonksiyon
export const createIncomeGroup = async (groupData) => {
  try {
    const response = await api.post('/income-groups', groupData);
    return response.data;
  } catch (error) {
    console.error("Gelir grubu oluşturulurken hata oluştu:", error);
    throw error;
  }
};

// Bir gelire ödeme ekleyen fonksiyon
export const addReceiptToIncome = async (incomeId, receiptData) => {
    try {
      const response = await api.post(`/incomes/${incomeId}/receipts`, receiptData);
      return response.data;
    } catch (error)
    {
      console.error(`ID'si ${incomeId} olan gelire ödeme eklenirken hata oluştu:`, error);
      throw error;
    }
};

export const getIncomePivot = async (month, options = {}) => {
  try {
    const response = await api.get('/incomes/pivot', {
      params: { month },
      ...options,
    });
    return response.data;
  } catch (error) {
    console.error("Gelir pivot verisi getirilirken hata oluştu:", error);
    throw error;
  }
};

export const getIncomeGroups = async () => {
  try {
    const response = await api.get('/income-groups');
    return response.data;
  } catch (error) {
    console.error("Gelir grupları getirilirken hata oluştu:", error);
    throw error;
  }
};
