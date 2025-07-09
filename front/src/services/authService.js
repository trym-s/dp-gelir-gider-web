import { api } from './api';

export const loginApi = async (username, password) => {
  console.log("DEBUG (authService): Login isteği gönderiliyor. Kullanıcı:", username);
  try {
    const response = await api.post('/users/login', {
      username: username,
      password: password,
    });

    // Başarılı olursa backend'den gelen yanıtı döndür
    console.log("DEBUG (authService): İstek başarılı. Yanıt:", response.data);
    return response.data;
  } catch (error) {
    console.error("DEBUG (authService): Login hatası!", error.response?.data || error.message);
    // Hata olursa, hatayı yakalayıp fırlat ki bileşen bunu handle edebilsin
    throw error.response?.data || new Error("Bilinmeyen bir hata oluştu.");
  }
};