import { api } from './api';

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

