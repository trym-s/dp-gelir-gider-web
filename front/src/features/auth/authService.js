import { api } from '../../api/api';

export const login = async (username, password) => {
  const response = await api.post('/auth/login', {
    username,
    password,
  });
  return response.data;
};

// HATA DÜZELTİLDİ: Gelecekteki kullanım için logout fonksiyonunu da export edelim.
export const logout = () => {
  // Şu an için bu fonksiyon bir şey yapmıyor ama merkezi olması önemli.
  console.log("Logout service called.");
};