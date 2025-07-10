import { Dropdown, Menu, Avatar, Typography, Layout } from "antd";
import {
  UserOutlined,
  LogoutOutlined
} from "@ant-design/icons";
import "../styles/Header.css";

const { Header: AntHeader } = Layout;
const { Text } = Typography;

export default function Header() {
  const username = localStorage.getItem("username") || "Kullanıcı";
  const role = localStorage.getItem("role") || "Kullanıcı";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    window.location.href = "/login";
  };

  const menu = (
    <Menu className="profile-dropdown-menu">
      <Menu.Item key="user-info" disabled className="dropdown-user-info">
        <strong style={{ fontSize: 16 }}>{username}</strong>
        <br />
        <Text type="secondary" style={{ fontSize: 13 }}>{role}</Text>
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout} style={{ fontSize: 15 }}>
        Çıkış Yap
      </Menu.Item>
    </Menu>
  );

  return (
    <AntHeader className="app-header">
      <div className="right">
        <span className="welcome-text">Hoş geldiniz, {username}!</span>
        <Dropdown overlay={menu} placement="bottomRight" trigger={['click']}>
          <Avatar
            size={48}
            icon={<UserOutlined />}
            className="profile-avatar"
          />
        </Dropdown>
      </div>
    </AntHeader>
  );
}
