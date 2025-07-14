
import React, { useState } from "react";
import { Form, Input, Button, Typography, Alert } from "antd";
import { MailOutlined, KeyOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import styles from "./LoginPage.module.css";

const { Title } = Typography;

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (values) => {
    setError('');
    setLoading(true);
    try {
      const { success, message } = await login(values.username, values.password);
      if (success) {
        navigate('/', { replace: true });
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
        <div className={styles.logoContainer}>
          <img src="/dp_logo.png" alt="Logo" className={styles.logo} />
        </div>
        <Title level={2} className={styles.loginTitle}>
           Giriş Yap
        </Title>

        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={handleLogin}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: "Lütfen kullanıcı adınızı girin!" }]}
          >
            <Input prefix={<MailOutlined />} placeholder="Kullanıcı Adı" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Lütfen şifrenizi girin!" }]}
          >
            <Input.Password prefix={<KeyOutlined />} placeholder="Şifre" />
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
