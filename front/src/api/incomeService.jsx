import { api } from './api';

// Tüm gelirleri filtreleme, sıralama ve sayfalama ile getiren fonksiyon
export const getIncomes = async (params = {}) => {
  try {
    const response = await api.get('/incomes', { params });
    return response.data; // { data: [...], pagination: {...} }
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

// Bir gelire tahsilat ekleyen fonksiyon
export const addReceiptToIncome = async (incomeId, receiptData) => {
  try {
    // Backend şemasının beklediği `income_id` alanını payload'a ekliyoruz.
    const payload = {
      ...receiptData,
      income_id: incomeId,
    };
    const response = await api.post(`/incomes/${incomeId}/receipts`, payload);
    return response.data;
  } catch (error) {
    console.error(`ID'si ${incomeId} olan gelire tahsilat eklenirken hata oluştu:`, error);
    throw error;
  }
};

// Pivot verisini getiren fonksiyon
export const getIncomePivot = async (month, options = {}) => {
  try {
    const response = await api.get('/incomes/pivot', {
      params: { month },
      ...options,
    });
    return response.data;
  } catch (error) {
    console.error("Gider pivot verisi getirilirken hata oluştu:", error);
    throw error;
  }
};

export const uploadIncomesExcel = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/incomes/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const importValidatedIncomes = async (incomeData) => {
  const response = await api.post('/incomes/import-validated', incomeData);
  return response.data;
};

export const uploadDubaiIncomesExcel = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  try {
    const response = await api.post('/incomes/upload-dubai', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    console.error("Dubai faturaları yüklenirken API hatası:", error);
    throw error;
  }
};

export const getIncomeReportPivot = async (month) => {
  try {
    const response = await api.get('/income_report_pivot', { params: { month } });
    return response.data;
  } catch (error) {
    console.error("Gelir raporu verisi getirilirken hata oluştu:", error);
    throw error;
  }
};

export const downloadIncomeTemplate = async () => {
  const response = await api.get('/incomes/download-template', {
    responseType: 'blob', // önemli
  });
  return response.data; // blob
};