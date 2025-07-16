import { api } from './api';

// Belirtilen tarih ve görünüm moduna göre başlangıç/bitiş tarihlerini hesaplayan yardımcı fonksiyon
const getDateRange = (date, viewMode) => {
  const d = new Date(date);
  let startDate, endDate;

  if (viewMode === 'daily') {
    startDate = new Date(d.setHours(0, 0, 0, 0)).toISOString().split('T')[0];
    endDate = startDate;
  } else if (viewMode === 'weekly') {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Haftanın başlangıcını Pazartesi olarak ayarla
    const startOfWeek = new Date(d.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    startDate = startOfWeek.toISOString().split('T')[0];
    endDate = endOfWeek.toISOString().split('T')[0];
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

