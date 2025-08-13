import { api } from '../../api/api';

export const login = async (username, password) => {
  try {
    const { data } = await api.post('/users/login', { username, password });
    return data;
  } catch (error) {
    // Sunucuya ulaşılamadı
    if (!error.response) {
      throw new Error('Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.');
    }

    const { status, data } = error.response;
    const backendMsg = data?.error || data?.message;

    if (status === 401) {
      // Her zaman Türkçe mesaj göster
      throw new Error('Kullanıcı adı veya şifre hatalı.');
    } else if (status === 403) {
      throw new Error('Bu işlemi yapma yetkiniz yok.');
    } else if (status >= 500) {
      throw new Error('Şu anda giriş yapılamıyor. Lütfen kısa bir süre sonra tekrar deneyin.');
    }

    throw new Error(backendMsg || 'Giriş işlemi başarısız oldu. Lütfen bilgilerinizi kontrol edin.');
  }
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
};
