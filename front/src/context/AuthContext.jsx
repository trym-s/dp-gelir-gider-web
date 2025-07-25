import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { api } from '../api/api';
import { login as apiLogin, logout as apiLogout } from '../features/auth/authService';

const AuthContext = createContext(null);

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
  // Başlangıç state'ini doğrudan localStorage'dan alıyoruz.
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  // Yükleme durumu, sadece başlangıçtaki token kontrolü için var.
  const [loading, setLoading] = useState(true);

  // Logout fonksiyonunu useCallback ile sarmalayarak referansının değişmesini önlüyoruz.
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    setPermissions([]);
  }, []);

  useEffect(() => {
    const tokenInStorage = localStorage.getItem('token');
    
    if (tokenInStorage) {
      const decoded = decodeToken(tokenInStorage);

      // 1. Önce token'ın bozuk olup olmadığını kontrol et
      if (!decoded) {
        // Eğer token bozuksa ve decode edilemiyorsa, direkt çıkış yap
        logout();
      } else {
        // 2. Eğer token sağlamsa, şimdi son kullanma tarihini kontrol et
        const isTokenExpired = decoded.exp * 1000 < Date.now();
        if (isTokenExpired) {
          // Eğer süresi dolmuşsa, yine çıkış yap
          logout();
        } else {
          // Sadece token hem sağlam hem de süresi geçerliyse kullanıcıyı ayarla
          setToken(tokenInStorage);
          setUser({
            id: decoded.sub,
            role: decoded.role,
            username: localStorage.getItem('username') || 'Kullanıcı'
          });
          setPermissions(decoded.permissions || []);
          api.defaults.headers.common['Authorization'] = `Bearer ${tokenInStorage}`;
        }
      }
    }
    setLoading(false);
  }, [logout]); 



  const login = async (username, password) => {
    try {
      const data = await apiLogin(username, password);
      if (data.access_token) {
        const newToken = data.access_token;
        const decoded = decodeToken(newToken);
        
        if (decoded) {
          localStorage.setItem('token', newToken);
          localStorage.setItem('username', username);
          setToken(newToken);
          setUser({
            id: decoded.sub,
            role: decoded.role,
            username: username
          });
          setPermissions(decoded.permissions || []);
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          return { success: true };
        }
      }
      return { success: false, message: "Token alınamadı veya decode edilemedi." };
    } catch (error) {
      logout(); // Login sırasında bir hata olursa da temizlik yap
      return { success: false, message: error.message || "Kullanıcı adı veya şifre hatalı." };
    }
  };

  const value = {
    token,
    user,
    permissions,
    loading,
    isAuthenticated: !!token, // Artık sadece token'ın varlığına bakmak yeterli.
    login,
    logout,
    hasPermission: (p) => permissions.includes(p),
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Yükleme bitene kadar alt bileşenleri render etme. Bu, race condition'ı önler. */}
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};