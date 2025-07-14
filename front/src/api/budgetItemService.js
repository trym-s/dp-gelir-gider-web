import { api } from './api';

export const getBudgetItems = async () => {
  try {
    const response = await api.get('/budget_items'); // Varsayılan endpoint
    return response.data;
  } catch (error) {
    console.error("Bütçe kalemleri getirilirken hata oluştu:", error);
    throw error;
  }
};

export const createBudgetItem = async (budgetItemData) => {
  try {
    const response = await api.post('/budget_items', budgetItemData); // Varsayılan endpoint
    return response.data;
  } catch (error) {
    console.error("Bütçe kalemi oluşturulurken hata oluştu:", error);
    throw error;
  }
};

export const updateBudgetItem = async (id, budgetItemData) => {
  try {
    const response = await api.put(`/budget_items/${id}`, budgetItemData);
    return response.data;
  } catch (error) {
    console.error(`ID'si ${id} olan bütçe kalemi güncellenirken hata oluştu:`, error);
    throw error;
  }
};
