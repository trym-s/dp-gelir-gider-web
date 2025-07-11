import { api } from '../../api/api';

export const login = async (username, password) => {
  const response = await api.post('/users/login', {
    username,
    password,
  });
  return response.data;
};

export const logout = () => {
  // Token'ı ve diğer kullanıcı bilgilerini localStorage'dan temizle
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  // Gelecekte sunucu tarafında bir token blacklist işlemi de burada çağrılabilir.
  console.log("Logout service: Token and user info cleared.");
};