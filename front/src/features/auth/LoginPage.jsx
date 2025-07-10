import React, { useState } from "react";
import { Form, Input, Button, Typography, Alert } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext"; // useAuth hook'unu import et

const { Title } = Typography;

export default function Login() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth(); // AuthContext'ten login fonksiyonunu al

  const handleLogin = async (values) => {
    setError('');
    setLoading(true);

    try {
      const { success, message } = await login(values.username, values.password);

      if (success) {
        // Login başarılı, AuthContext state'i güncelledi.
        // Şimdi dashboard'a yönlendirebiliriz.
        navigate('/dashboard');
      } else {
        setError(message || "Giriş işlemi başarısız.");
      }
    } catch (err) {
      // Beklenmedik bir hata olursa
      setError('Beklenmedik bir hata oluştu.');
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
          onFinish={handleLogin}
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
