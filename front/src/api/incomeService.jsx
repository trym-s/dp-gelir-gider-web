import { api } from './api';
import { message } from 'antd';

// Tüm gelirleri filtreleme, sıralama ve sayfalama ile getiren fonksiyon
export const getIncomes = async (params = {}) => {
  try {
    const response = await api.get('/incomes', { params });
    return response.data; // { data: [...], pagination: {...} }
  } catch (error) {
    console.error("Gelirler getirilirken hata oluştu:", error);
    throw error;
  }
};

// ID ile tek bir gelir getiren fonksiyon
export const getIncomeById = async (id) => {
  try {
    const response = await api.get(`/incomes/${id}`);
    return response.data;
  } catch (error) {
    console.error(`ID'si ${id} olan gelir getirilirken hata oluştu:`, error);
    throw error;
  }
};

// Yeni bir gelir oluşturan fonksiyon
export const createIncome = async (incomeData) => {
  try {
    const response = await api.post('/incomes', incomeData);
    return response.data;
  } catch (error) {
    console.error("Gelir oluşturulurken hata oluştu:", error);
    throw error;
  }
};

// Mevcut bir geliri güncelleyen fonksiyon
export const updateIncome = async (id, incomeData) => {
  try {
    const response = await api.put(`/incomes/${id}`, incomeData);
    return response.data;
  } catch (error) {
    console.error(`ID'si ${id} olan gelir güncellenirken hata oluştu:`, error);
    throw error;
  }
};

// Bir geliri silen fonksiyon
export const deleteIncome = async (id) => {
  try {
    const response = await api.delete(`/incomes/${id}`);
    return response.data;
  } catch (error) {
    console.error(`ID'si ${id} olan gelir silinirken hata oluştu:`, error);
    throw error;
  }
};

// Bir gelire tahsilat ekleyen fonksiyon
export const addReceiptToIncome = async (incomeId, receiptData) => {
  try {
    // Backend şemasının beklediği `income_id` alanını payload'a ekliyoruz.
    const payload = {
      ...receiptData,
      income_id: incomeId,
    };
    const response = await api.post(`/incomes/${incomeId}/receipts`, payload);
    return response.data;
  } catch (error) {
    console.error(`ID'si ${incomeId} olan gelire tahsilat eklenirken hata oluştu:`, error);
    throw error;
  }
};

// Pivot verisini getiren fonksiyon
export const getIncomePivot = async (month, options = {}) => {
  try {
    const response = await api.get('/incomes/pivot', {
      params: { month },
      ...options,
    });
    return response.data;
  } catch (error) {
    console.error("Gider pivot verisi getirilirken hata oluştu:", error);
    throw error;
  }
};

export const getIncomeYearlyPivot = async (year, options = {}) => {
  try {
    const response = await api.get('/incomes/yearly_pivot', {
      params: { year },
      ...options,
    });
    return response.data;
  } catch (error) {
    console.error("Yıllık gelir pivot verisi getirilirken hata oluştu:", error);
    throw error;
  }
};

export const uploadIncomesExcel = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/incomes/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const importValidatedIncomes = async (incomeData) => {
  const response = await api.post('/incomes/import-validated', incomeData);
  return response.data;
};

export const uploadDubaiIncomesExcel = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  try {
    const response = await api.post('/incomes/upload-dubai', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    console.error("Dubai faturaları yüklenirken API hatası:", error);
    throw error;
  }
};

export const getIncomeReportPivot = async (month) => {
  try {
    const response = await api.get('/income_report_pivot', { params: { month } });
    return response.data;
  } catch (error) {
    console.error("Gelir raporu verisi getirilirken hata oluştu:", error);
    throw error;
  }
};

export const getMonthlyCollectionsReport = async (month) => {
    try {
        // Yeni ve doğru URL'i çağırıyoruz
        const response = await api.get('/monthly_collections_report', { params: { month } });
        return response.data;
    } catch (error) {
        console.error("Aylık tahsilat raporu verisi getirilirken hata oluştu:", error);
        throw error;
    }
};

export const downloadIncomeTemplate = async () => {
  try {
    const response = await api.get('/incomes/download-template', {
      responseType: 'blob', // Dosya indirme işlemi için bu önemlidir
    });
    return response.data;
  } catch (error) {
    console.error("Gelir şablonu indirilirken hata oluştu:", error);
    throw error;
  }
};

export const exportIncomes = async (filters) => {
  console.log("1. exportIncomes servisi çalıştı. Filtreler:", filters);
  try {
    const response = await api.get('/incomes/export', {
      params: filters,
      responseType: 'blob',
    });
    console.log("2. API'den başarılı yanıt alındı (200 OK).");
    const result = { success: true, blob: response.data };
    console.log("3. Servis, başarı objesi döndürüyor:", result);
    return result;
  } catch (error) {
    console.error("HATA: API isteği catch bloğuna düştü.", error);
    // 404 "Veri Bulunamadı" hatasını yakala
    if (error.response && error.response.status === 404) {
      console.log("4. Hata kodu 404 olarak tespit edildi (Veri Bulunamadı).");
      try {
        const errorText = await error.response.data.text();
        const errorJson = JSON.parse(errorText);
        const result = { success: false, message: errorJson.message };
        console.log("5. Servis, başarısızlık objesi döndürüyor:", result);
        return result;
      } catch (e) {
        const result = { success: false, message: 'Dışa aktarılacak veri bulunamadı.' };
        console.log("5b. Hata mesajı JSON değil. Servis, genel başarısızlık objesi döndürüyor:", result);
        return result;
      }
    } else {
      // Diğer tüm sunucu hataları için genel bir hata mesajı döndür
      console.log("6. Hata kodu 404'ten farklı. Genel sunucu hatası.");
      message.error('Dışa aktarma sırasında bir sunucu hatası oluştu.');
      return { success: false, message: 'Sunucu hatası.' };
    }
  }
};

