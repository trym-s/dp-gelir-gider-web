import { api } from '../../api/api';

export const login = async (username, password) => {
  const response = await api.post('/users/login', {
    username,
    password,
  });
  return response.data;
};

export const logout = () => {
  // Şu an için bu fonksiyon bir şey yapmıyor ama merkezi olması önemli.
  console.log("Logout service called.");
};