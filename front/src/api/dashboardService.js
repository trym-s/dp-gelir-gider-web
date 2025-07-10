import { api } from './api';

export const getDashboardSummary = async () => {
  try {
    // '/api' base URL'ine ek olarak '/summary' yoluna GET isteği at
    const response = await api.get('/summary');
    return response.data;
  } catch (error) {
    console.error("Dashboard özeti alınırken hata oluştu:", error);
    // Hatanın üst katman tarafından yakalanabilmesi için tekrar fırlat
    throw error;
  }
};