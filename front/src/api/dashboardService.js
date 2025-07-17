import { api } from '../api/api';

// Belirtilen tarih ve görünüm moduna göre başlangıç/bitiş tarihlerini hesaplayan yardımcı fonksiyon
const getDateRange = (date, viewMode) => {
  const d = new Date(date);
  let startDate, endDate;

  if (viewMode === 'daily') {
    startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().split('T')[0];
    endDate = startDate;
  } else { // 'monthly'
    startDate = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  }
  
  return { startDate, endDate };
};

// Gider Raporu (Özet ve Detaylar) getiren birleşik fonksiyon
export const getExpenseReport = async (date, viewMode, options = {}) => {
  try {
    const { startDate, endDate } = getDateRange(date, viewMode);
    const response = await api.get('/expense_report', {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
      signal: options.signal,
    });
    return response.data; // { summary: {...}, details: [...] }
  } catch (error) {
    console.error("Gider raporu alınırken hata oluştu:", error);
    throw error;
  }
};

// Gelir Raporu (Özet ve Detaylar) getiren birleşik fonksiyon
export const getIncomeReport = async (date, viewMode, options = {}) => {
  try {
    const { startDate, endDate } = getDateRange(date, viewMode);
    const response = await api.get('/income_report', {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
      signal: options.signal,
    });
    return response.data; // { summary: {...}, details: [...] }
  } catch (error) {
    console.error("Gelir raporu alınırken hata oluştu:", error);
    throw error;
  }
};

// Alınacak kalan gelirlerin detaylarını getiren fonksiyon (ileride implemente edilecek)
export const getRemainingIncomeDetails = async (date, viewMode) => {
    console.warn("getRemainingIncomeDetails henüz implemente edilmedi.");
    // const { startDate, endDate } = getDateRange(date, viewMode);
    // TODO: Kalan gelirler için doğru endpoint'e bağlanacak.
    return [];
};

// Günlük/Aylık gider grafiği verisini getiren fonksiyon
export const getExpenseGraphData = async (date, viewMode) => {
  const { startDate, endDate } = getDateRange(date, viewMode);
  try {
    const response = await api.get('/chart/expense', {
      params: {
        date_start: startDate,
        date_end: endDate,
        group_by: viewMode === 'daily' ? 'day' : viewMode === 'weekly' ? 'week' : 'month',
      }
    });

    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error("Gider grafiği verisi alınırken hata oluştu:", error);
    return [];
  }
};
// Günlük/Aylık gelir grafiği verisini getiren fonksiyon
export const getIncomeGraphData = async (date, viewMode) => {
  const { startDate, endDate } = getDateRange(date, viewMode);
  try {
    const response = await api.get('/chart/income', {
      params: {
        date_start: startDate,
        date_end: endDate,
        group_by: viewMode === 'daily' ? 'day' : viewMode === 'weekly' ? 'week' : 'month',
      }
    });

    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error("Gelir grafiği verisi alınırken hata oluştu:", error);
    return [];
  }
};

export const getExpenseDistributionData = async (date) => {
  const { startDate, endDate } = getDateRange(date, 'monthly');
  try {
    const response = await api.get('/chart/expense_distribution', {
      params: {
        date_start: startDate,
        date_end: endDate
      }
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error("Gider dağılım verisi alınamadı:", error);
    return [];
  }
};