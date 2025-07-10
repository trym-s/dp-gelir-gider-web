import { api } from './api';

export const getPaymentTypes = async () => {
  try {
    const response = await api.get('/payment_types');
    return response.data;
  } catch (error) {
    console.error("Ödeme türleri getirilirken hata oluştu:", error);
    throw error;
  }
};

export const createPaymentType = async (data) => {
  try {
    const response = await api.post('/payment_types', data);
    return response.data;
  } catch (error) {
    console.error("Ödeme türü oluşturulurken hata oluştu:", error);
    throw error;
  }
};

export const updatePaymentType = async (id, data) => {
  try {
    const response = await api.put(`/payment_types/${id}`, data);
    return response.data;
  } catch (error) {
    console.error(`ID'si ${id} olan ödeme türü güncellenirken hata oluştu:`, error);
    throw error;
  }
};
