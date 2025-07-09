import { Form, Input, Button, Typography, message } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import React, { useEffect } from "react";

const { Title } = Typography;

export default function Login() {
  const navigate = useNavigate();
  useEffect(() => {
    // Login ekranı açıldığında token varsa sil
    localStorage.removeItem("token");
    localStorage.removeItem("username");
  }, []);
  const onFinish = (values) => {
    const { username } = values;

    if (username) {
      localStorage.setItem("username", username); // ✅ kullanıcı adını kaydet
      localStorage.setItem("token", "dummy-token"); // sahte giriş
      message.success(`Hoş geldiniz, ${username}!`);
      navigate("/");
    } else {
      message.error("Kullanıcı adı gerekli!");
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
        <Title level={3} style={{ textAlign: "center" }}>
          Giriş Yap
        </Title>

        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          layout="vertical"
        >
          <Form.Item
            label="Kullanıcı Adı"
            name="username"
            rules={[{ required: true, message: "Kullanıcı adı gerekli!" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="admin" />
          </Form.Item>

          <Form.Item
            label="Şifre"
            name="password"
            rules={[{ required: true, message: "Şifre gerekli!" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="1234" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Giriş Yap
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
