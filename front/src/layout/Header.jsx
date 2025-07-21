import React from 'react';
import { Layout, Dropdown, Menu, Avatar, Tag, Button } from 'antd';
import { useAuth } from '../context/AuthContext';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import './Header.css';

const { Header: AntHeader } = Layout;

export default function Header() {
  const { user, logout } = useAuth();
  const username = user?.username || 'Kullanıcı';

  const getRoleName = (roleId) => {
    const roles = { 1: 'Admin', 2: 'User', 3: 'Viewer' };
    return roles[roleId] || 'Bilinmeyen Rol';
  };

  const roleName = getRoleName(user?.role);

  const menu = (
    <Menu className="profile-dropdown-menu">
      <Menu.Item key="user-info" disabled className="dropdown-user-info">
        <strong style={{ fontSize: 16, display: 'block', marginBottom: '4px' }}>{username}</strong>
        <Tag className="role-tag">{roleName}</Tag>
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" className="logout-menu-item">
        <Button type="primary" danger icon={<LogoutOutlined />} onClick={logout} block>
          Çıkış Yap
        </Button>
      </Menu.Item>
    </Menu>
  );

  return (
    <AntHeader className="app-header">
      <div className="header-right">
        <span className="welcome-text">Hoş geldiniz, {username}!</span>
        <Dropdown overlay={menu} placement="bottomRight" trigger={['click']}>
          <Avatar size={40} icon={<UserOutlined />} className="profile-avatar" />
        </Dropdown>
      </div>
    </AntHeader>
  );
}

