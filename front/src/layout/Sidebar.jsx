import React from 'react';
import { Layout, Menu, Button } from 'antd';
import {
  HomeOutlined,
  BarChartOutlined,
  DollarOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
} from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Sidebar.css'; // Güncellenmiş CSS dosyasını kullan

const { Sider } = Layout;

export default function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Aktif menü anahtarını belirlemek için daha sağlam bir mantık
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.startsWith('/giderler')) return '/giderler';
    if (path.startsWith('/gelirler')) return '/gelirler';
    // Diğer tüm yollar için ana sayfayı varsayalım
    return '/';
  };

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      width={220}
      collapsedWidth={80}
      theme="dark"
      trigger={null}
      style={{ minHeight: '100vh', position: 'fixed', left: 0, top: 0, bottom: 0 }}
    >
      <div className="sidebar-header">
        <div className="logo-container" onClick={() => navigate('/')} style={{ display: collapsed ? 'none' : 'flex' }}>
          <img 
            src="/dp_logo.png" 
            alt="Logo" 
            className="logo-image"
          />
        </div>
        <Button
          type="text"
          icon={collapsed ? <DoubleRightOutlined /> : <DoubleLeftOutlined />}
          onClick={() => setCollapsed(!collapsed)}
          className="sidebar-trigger"
        />
      </div>

      <Menu
        mode="inline"
        theme="dark"
        selectedKeys={[getSelectedKey()]} // Dinamik anahtar kullan
        inlineCollapsed={collapsed}
      >
        <Menu.Item key="/" icon={<HomeOutlined />}>
          <Link to="/">Ana Sayfa</Link>
        </Menu.Item>

        <Menu.Item key="/gelirler" icon={<BarChartOutlined />}>
          <Link to="/gelirler">Gelirler</Link>
        </Menu.Item>

        <Menu.Item key="/giderler" icon={<DollarOutlined />}>
          <Link to="/giderler">Giderler</Link>
        </Menu.Item>
      </Menu>
    </Sider>
  );
}
