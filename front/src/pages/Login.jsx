import React, { useState } from "react"; // 1. HATA DÜZELTİLDİ: useState buraya eklendi.
import { Form, Input, Button, Typography, Alert } from "antd"; // Alert eklendi
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { loginApi } from '../services/authService';

const { Title } = Typography;

export default function Login() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (values) => {
    console.log('DEBUG (Login.jsx): Form gönderildi. Değerler:', values);
    setError('');
    setLoading(true);

    try {
      const data = await loginApi(values.username, values.password);

      if (data.access_token) {
        console.log("DEBUG (Login.jsx): Access token başarıyla alındı:", data.access_token);

        // ----> EN MİNİMAL ADIM: TOKEN'I LOCALSTORAGE'A KAYDET <----
        localStorage.setItem('token', data.access_token);
        console.log("DEBUG (Login.jsx): Token localStorage'a kaydedildi.");

        // Login başarılı, ana sayfaya yönlendir
        navigate('/');
      } else {
        setError("Token alınamadı ama hata da oluşmadı. API yanıtını kontrol edin.");
      }
    } catch (err) {
      // loginApi'den fırlatılan hatayı yakala
      console.error("DEBUG (Login.jsx): Yakalanan hata kullanıcıya gösteriliyor.", err);
      setError(err.error || 'Kullanıcı adı veya şifre hatalı.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        justifyContent: "center",
        alignItems: "center",
        background: "#f0f2f5",
      }}
    >
      <div
        style={{
          width: 350,
          padding: 32,
          background: "#fff",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          borderRadius: 8,
        }}
      >
        <Title level={3} style={{ textAlign: "center", marginBottom: 24 }}>
          Giriş Yap
        </Title>

        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={handleLogin} // 2. HATA DÜZELTİLDİ: 'onFinish' doğru fonksiyona bağlandı.
          layout="vertical"
        >
          <Form.Item
            label="Kullanıcı Adı"
            name="username"
            rules={[{ required: true, message: "Kullanıcı adı gerekli!" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="kullaniciadi" />
          </Form.Item>

          <Form.Item
            label="Şifre"
            name="password"
            rules={[{ required: true, message: "Şifre gerekli!" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="şifre" />
          </Form.Item>

          {/* Hata mesajını kullanıcıya göstermek için Alert bileşeni eklendi */}
          {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 24 }} />}

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Giriş Yap
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}