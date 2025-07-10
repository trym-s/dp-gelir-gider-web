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

const createMockData = (prefix, count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i + 1}`,
    description: `${prefix} Açıklama ${i + 1}`,
    amount: Math.random() * 500 + 50,
    date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  }));
};

// Detay verilerini getiren sahte API çağrıları
const mockApiCall = (data) => {
  return new Promise(resolve => setTimeout(() => resolve(data), 500));
};

/**
 * Tıklanan kart tipine göre gider detaylarını getirir.
 * @param {'paid' | 'remaining'} type - 'paid' veya 'remaining' olabilir.
 */
export const getExpenseDetails = (type) => {
  if (type === 'paid') {
    return mockApiCall(createMockData('Ödeme', 8));
  }
  return mockApiCall(createMockData('Ödenmemiş Gider', 4));
};

/**
 * Tıklanan kart tipine göre gelir detaylarını getirir.
 * @param {'received' | 'remaining'} type - 'received' veya 'remaining' olabilir.
 */
export const getIncomeDetails = (type) => {
  if (type === 'received') {
    return mockApiCall(createMockData('Alınan Gelir', 6));
  }
  return mockApiCall(createMockData('Alınmamış Gelir', 3));
};