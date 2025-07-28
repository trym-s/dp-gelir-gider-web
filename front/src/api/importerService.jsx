
import { api } from './api';
/**
 * Bir dosyayı (PDF/Excel) sunucuya göndererek ayrıştırılmasını sağlar.
 * @param {FormData} formData - 'file', 'type' ve 'bankName' alanlarını içeren form verisi.
 * @returns {Promise<Array<object>>} - Sunucuda ayrıştırılmış işlem verilerini içeren JSON dizisi.
 */
export const parseFileOnServer = async (formData) => {
  console.log("🚀 [importerService] API'ye gönderilecek FormData:", formData);
  // FormData içeriğini görmek için:
  for (let [key, value] of formData.entries()) {
    console.log(`  -> ${key}:`, value);
  }

  try {
    const response = await api.post('/importer/file-parser', formData, {
      // FormData gönderirken 'Content-Type' header'ını tarayıcının
      // kendisinin ayarlamasına izin vermek en iyisidir.
      // Axios bunu otomatik olarak yapar.
    });
    
    console.log("✅ [importerService] API'den başarılı yanıt alındı:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ [importerService] API hatası:", error.response?.data || error.message);
    // Hatanın bileşen tarafından yakalanıp kullanıcıya gösterilmesi için yeniden fırlatıyoruz.
    throw error;
  }
};