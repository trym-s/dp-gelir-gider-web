import { api } from './api';

export const getCompanies = async () => {
  try {
    const response = await api.get('/companies');
    return response.data;
  } catch (error) {
    console.error("Şirketler getirilirken hata oluştu:", error);
    throw error;
  }
};

export const createCompany = async (companyData) => {
  try {
    const response = await api.post('/companies', companyData);
    return response.data;
  } catch (error) {
    console.error("Şirket oluşturulurken hata oluştu:", error);
    throw error;
  }
};

export const updateCompany = async (id, companyData) => {
  try {
    const response = await api.put(`/companies/${id}`, companyData);
    return response.data;
  } catch (error) {
    console.error(`ID'si ${id} olan şirket güncellenirken hata oluştu:`, error);
    throw error;
  }
};
