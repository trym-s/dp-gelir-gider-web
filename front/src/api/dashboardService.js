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
 

export const getPaymentsWithExpenses = async(month) => {
  const now = month ? new Date(month + '-01') : new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
 
  const response = await api.get('/payments', {
        params: {
          date_start: startOfMonth,
          date_end: endOfMonth,
          sort_by: 'payment_date',
          sort_order: 'desc'
        }
      });



    }



export const getExpenseDetailsForThisMonth = async (type, month) => {
  // Zaman filtresi için başlangıç ve bitiş tarihlerini hesapla
  const now = month ? new Date(month + '-01') : new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  // Şimdilik sadece 'paid' (ödenen) durumu için gerçek veri çekiyoruz.
  // Diğer durumlar ('remaining') için de benzer endpoint'ler oluşturulabilir.
  if (type === 'paid') {
    try {
      const response = await api.get('/payments', {
        params: {
          date_start: startOfMonth,
          date_end: endOfMonth,
          sort_by: 'payment_date',
          sort_order: 'desc'
        }
      });
      // Gelen veri yapısı { data: [...], pagination: {...} } şeklinde
      // Bu yüzden response.data.data'yı dönüyoruz.
      return Array.isArray(response.data.data) ? response.data.data : []; 
    } catch (error) {
      console.error("Ödeme detayları alınırken hata oluştu:", error);
      throw error;
    }
  } else if (type === 'expense_remaining') {
    try {
      const response = await api.get('/expenses', {
        params: {
          date_start: startOfMonth,
          date_end: endOfMonth,
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
  }
  return [];
};


export const getIncomeDetails = async (type, month) => {
    const now = month ? new Date(month + '-01') : new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    // 'received' (alınan) durumu için IncomeReceipt'leri çekeceğiz.
    if (type === 'received') {
        try {
            // Doğru endpoint'e istek atıyoruz: /api/receipts
            const response = await api.get('/receipts', {
                 params: {
                    date_start: startOfMonth,
                    date_end: endOfMonth,
                    sort_by: 'receipt_date',
                    sort_order: 'desc'
                 }
            });
            // API'nin { data: [...] } yapısında veri döndürdüğünü varsayarak düzeltme
            return Array.isArray(response.data) ? response.data : [];
        } catch (error) {
            console.error("Alınan gelir detayları alınırken hata oluştu:", error);
            throw error;
        }
    }
    
    // TODO: 'income_remaining' için de endpoint'e bağlanmalı.
    return [];
};