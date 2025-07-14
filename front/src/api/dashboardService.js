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

// Özet verilerini getiren fonksiyon
export const getDashboardSummary = async (date, viewMode, options = {}) => {
  try {
    const { startDate, endDate } = getDateRange(date, viewMode);
    const response = await api.get('/summary', {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
      signal: options.signal,
    });
    return response.data;
  } catch (error) {
    console.error("Dashboard özeti alınırken hata oluştu:", error);
    throw error;
  }
};

// Ödenen giderlerin detaylarını (ödemeleri) getiren fonksiyon
export const getPaidExpenseDetails = async (date, viewMode) => {
  const { startDate, endDate } = getDateRange(date, viewMode);
  try {
    const response = await api.get('/payments', {
      params: {
        date_start: startDate,
        date_end: endDate,
        sort_by: 'payment_date',
        sort_order: 'desc'
      }
    });
    return Array.isArray(response.data.data) ? response.data.data : [];
  } catch (error) {
    console.error("Ödeme detayları alınırken hata oluştu:", error);
    throw error;
  }
};

// Kalan (ödenmemiş veya kısmi ödenmiş) giderlerin detaylarını getiren fonksiyon
export const getRemainingExpenseDetails = async (date, viewMode) => {
  const { startDate, endDate } = getDateRange(date, viewMode);
  try {
    const response = await api.get('/expenses', {
      params: {
        date_start: startDate,
        date_end: endDate,
        status: 'UNPAID,PARTIALLY_PAID',
        sort_by: 'date',
        sort_order: 'desc'
      }
    });
    return Array.isArray(response.data.data) ? response.data.data : [];
  } catch (error) {
    console.error("Kalan gider detayları alınırken hata oluştu:", error);
    throw error;
  }
};

// Alınan gelirlerin detaylarını (tahsilatları) getiren fonksiyon
export const getReceivedIncomeDetails = async (date, viewMode) => {
    const { startDate, endDate } = getDateRange(date, viewMode);
    try {
        const response = await api.get('/receipts', {
             params: {
                date_start: startDate,
                date_end: endDate,
                sort_by: 'receipt_date',
                sort_order: 'desc'
             }
        });
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error("Alınan gelir detayları alınırken hata oluştu:", error);
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