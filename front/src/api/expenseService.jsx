import { api } from './api';

// Tüm giderleri filtreleme, sıralama ve sayfalama ile getiren fonksiyon
export const getExpenses = async (params = {}) => {
  try {
    const response = await api.get('/expenses', { params });
    return response.data; 
  } catch (error) {
    console.error("Giderler getirilirken hata oluştu:", error);
    throw error;
  }
};

// ID ile tek bir gider getiren fonksiyon
export const getExpenseById = async (id) => {
  try {
    const response = await api.get(`/expenses/${id}`);
    return response.data;
  } catch (error) {
    console.error(`ID'si ${id} olan gider getirilirken hata oluştu:`, error);
    throw error;
  }
};

// Yeni bir gider oluşturan fonksiyon
export const createExpense = async (expenseData) => {
  try {
    const response = await api.post('/expenses', expenseData);
    return response.data;
  } catch (error) {
    console.error("Gider oluşturulurken hata oluştu:", error);
    throw error;
  }
};

// Mevcut bir gideri güncelleyen fonksiyon
export const updateExpense = async (id, expenseData) => {
  try {
    const response = await api.put(`/expenses/${id}`, expenseData);
    return response.data;
  } catch (error) {
    console.error(`ID'si ${id} olan gider güncellenirken hata oluştu:`, error);
    throw error;
  }
};

// Bir gideri silen fonksiyon
export const deleteExpense = async (id) => {
  try {
    const response = await api.delete(`/expenses/${id}`);
    return response.data;
  } catch (error) {
    console.error(`ID'si ${id} olan gider silinirken hata oluştu:`, error);
    throw error;
  }
};

// Tekrarlı gider grubu oluşturan fonksiyon
export const createExpenseGroup = async (groupData) => {
  try {
    const response = await api.post('/expense-groups', groupData);
    return response.data;
  } catch (error) {
    console.error("Gider grubu oluşturulurken hata oluştu:", error);
    throw error;
  }
};

// Bir gidere ödeme ekleyen fonksiyon
export const addPaymentToExpense = async (expenseId, paymentData) => {
  try {
    const response = await api.post(`/expenses/${expenseId}/payments`, paymentData);
    return response.data;
  } catch (error) {
    console.error(`ID'si ${expenseId} olan gidere ödeme eklenirken hata oluştu:`, error);
    throw error;
  }
};

export const getExpenseGroups = async () => {
  try {
    const response = await api.get('/expense-groups');
    return response.data;
  } catch (error) {
    console.error("Gider grupları getirilirken hata oluştu:", error);
    throw error;
  }
};

export const getExpensePivot = async (month, options = {}) => {
  try {
    const response = await api.get('/expenses/pivot', {
      params: { month },
      ...options,
    });
    return response.data;
  } catch (error) {
    console.error("Gider pivot verisi getirilirken hata oluştu:", error);
    throw error;
  }
};