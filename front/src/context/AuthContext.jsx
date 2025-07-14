import React, { createContext, useState, useContext, useEffect } from 'react';
import { api } from '../api/api';
import { login as apiLogin, logout as apiLogout } from '../features/auth/authService';

const AuthContext = createContext(null);

// Basit bir JWT decode fonksiyonu
const decodeToken = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Token decode edilemedi:", e);
    return null;
  }
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tokenInStorage = localStorage.getItem('token');
    if (tokenInStorage) {
      const decodedUser = decodeToken(tokenInStorage);
      if (decodedUser) {
        setUser({
          id: decodedUser.sub,
          role: decodedUser.role,
          username: localStorage.getItem('username') || 'Kullanıcı'
        });
        setToken(tokenInStorage);
        api.defaults.headers.common['Authorization'] = `Bearer ${tokenInStorage}`;
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const data = await apiLogin(username, password);
      if (data.access_token) {
        const newToken = data.access_token;
        const decodedUser = decodeToken(newToken);
        
        if (decodedUser) {
          setUser({
            id: decodedUser.sub,
            role: decodedUser.role,
            username: username
          });
          setToken(newToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          localStorage.setItem('token', newToken);
          localStorage.setItem('username', username);
          return { success: true };
        }
      }
      return { success: false, message: "Token alınamadı veya decode edilemedi." };
    } catch (error) {
      console.error("AuthContext Login Hatası:", error);
      return { success: false, message: error.message || "Kullanıcı adı veya şifre hatalı." };
    }
  };

  const logout = () => {
    apiLogout();
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('username');
  };

  const value = {
    token,
    user,
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
