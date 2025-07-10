import React, { createContext, useState, useContext, useEffect } from 'react';
import { api } from '../api/api';
import { login as apiLogin, logout as apiLogout } from '../features/auth/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tokenInStorage = localStorage.getItem('token');
    if (tokenInStorage) {
      setToken(tokenInStorage);
      api.defaults.headers.common['Authorization'] = `Bearer ${tokenInStorage}`;
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      // Artık doğru yerden gelen apiLogin fonksiyonunu kullanıyoruz
      const data = await apiLogin(username, password);
      if (data.access_token) {
        const newToken = data.access_token;
        setToken(newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        localStorage.setItem('token', newToken);
        return { success: true };
      }
      return { success: false, message: "API'den token gelmedi." };
    } catch (error) {
      console.error("AuthContext Login Hatası:", error);
      return { success: false, message: error.message || "Kullanıcı adı veya şifre hatalı." };
    }
  };

  const logout = () => {
    // authService'deki logout fonksiyonu gelecekte (örn. token'ı blacklist'e eklemek için)
    // bir API çağrısı yapabilir, şimdilik sadece state temizliyoruz.
    apiLogout(); // Bu fonksiyon şu an sadece localStorage'ı temizliyor olabilir ama merkezi olması önemli.
    setToken(null);
    delete api.defaults.headers.common['Authorization'];
  };

  const value = {
    token,
    isAuthenticated: !!token,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};