import { api } from './api';

export const getRegions = async () => {
  try {
    const response = await api.get('/regions'); // Varsayılan endpoint
    return response.data;
  } catch (error) {
    console.error("Bölgeler getirilirken hata oluştu:", error);
    throw error;
  }
};

export const createRegion = async (regionData) => {
  try {
    const response = await api.post('/regions', regionData); // Varsayılan endpoint
    return response.data;
  } catch (error) {
    console.error("Bölge oluşturulurken hata oluştu:", error);
    throw error;
  }
};

export const updateRegion = async (id, regionData) => {
  try {
    const response = await api.put(`/regions/${id}`, regionData);
    return response.data;
  } catch (error) {
    console.error(`ID'si ${id} olan bölge güncellenirken hata oluştu:`, error);
    throw error;
  }
};
