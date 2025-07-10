import { api } from './api';

export const getAccountNames = async () => {
  try {
    const response = await api.get('/account_names'); // Varsayılan endpoint
    return response.data;
  } catch (error) {
    console.error("Hesap adları getirilirken hata oluştu:", error);
    throw error;
  }
};

export const createAccountName = async (accountNameData) => {
  try {
    const response = await api.post('/account_names', accountNameData); // Varsayılan endpoint
    return response.data;
  } catch (error) {
    console.error("Hesap adı oluşturulurken hata oluştu:", error);
    throw error;
  }
};

export const updateAccountName = async (id, accountNameData) => {
  try {
    const response = await api.put(`/account_names/${id}`, accountNameData);
    return response.data;
  } catch (error) {
    console.error(`ID'si ${id} olan hesap adı güncellenirken hata oluştu:`, error);
    throw error;
  }
};
