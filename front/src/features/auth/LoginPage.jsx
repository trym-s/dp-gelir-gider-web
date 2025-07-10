
import React, { useState } from "react";
import { Form, Input, Button, Typography, Alert } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
// Stil dosyamızı import ediyoruz
import styles from "./LoginPage.module.css";

const { Title } = Typography;

// Bileşenin adını standartlarımıza uygun olarak "LoginPage" yapalım
export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  // Antd'nin onFinish'i, form verilerini 'values' objesi olarak bize zaten veriyor.
  const handleLogin = async (values) => {
    setError('');
    setLoading(true);

    try {
      const { success, message } = await login(values.username, values.password);

      if (success) {
        navigate('/dashboard', { replace: true });
      } else {
        setError(message || "Giriş işlemi başarısız oldu.");
      }
    } catch (err) {
      setError('Beklenmedik bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPageContainer}>
      <div className={styles.loginFormContainer}>
        <Title level={3} className={styles.loginTitle}>
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
            rules={[{ required: true, message: "Lütfen kullanıcı adınızı girin!" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="kullaniciadi" />
          </Form.Item>

          <Form.Item
            label="Şifre"
            name="password"
            rules={[{ required: true, message: "Lütfen şifrenizi girin!" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="şifre" />
          </Form.Item>

          {error && (
            <Alert 
              message={error} 
              type="error" 
              showIcon 
              className={styles.alert} 
            />
          )}

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