import { api } from './api';

export const getCustomers  = async () => {
  try {
    const response = await api.get('/customers');
    return response.data;
  } catch (error) {
    console.error("Müşteriler getirilirken hata oluştu:", error);
    throw error;
  }
};

export const createCustomer  = async (companyData) => {
  try {
    const response = await api.post('/customers', companyData);
    return response.data;
  } catch (error) {
    console.error("Müşteri oluşturulurken hata oluştu:", error);
    throw error;
  }
};

export const updateCustomer = async (id, customerData) => {
  try {
    const response = await api.put(`/customers/${id}`, customerData);
    return response.data;
  } catch (error) {
    console.error(`ID'si ${id} olan müşteri güncellenirken hata oluştu:`, error);
    throw error;
  }
};
