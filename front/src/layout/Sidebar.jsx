import React from 'react';
import { Layout, Menu, Button } from 'antd';
import {
  HomeOutlined,
  BarChartOutlined,
  DollarOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
  UnorderedListOutlined, // Yeni ikonlar
  PlusOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Sidebar.css';

const { Sider } = Layout;

// Giderler için alt menü elemanlarını burada tanımlayalım
const giderlerChildren = [
  {
    key: '/giderler/liste',
    label: <Link to="/giderler/liste">Gider Listesi</Link>,
    icon: <UnorderedListOutlined />,
  },
  {
    key: '/giderler/ekle',
    label: <Link to="/giderler/ekle">Gider Ekle</Link>,
    icon: <PlusOutlined />,
  },
  // YENİ EKLEDİĞİMİZ RAPOR SAYFASI
  {
    key: '/raporlar/gider',
    label: <Link to="/raporlar/gider">Gider Raporu</Link>,
    icon: <LineChartOutlined />,
  },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Hangi alt menünün açık olacağını belirlemek için
  const getDefaultOpenKey = () => {
    if (giderlerChildren.some(child => child.key === location.pathname)) {
      return ['giderlerSubMenu'];
    }
    return [];
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
          <img src="/dp_logo.png" alt="Logo" className="logo-image" />
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
        selectedKeys={[location.pathname]} // Seçili linki doğrudan URL'den alıyoruz
        defaultOpenKeys={getDefaultOpenKey()} // Sayfa yüklendiğinde doğru alt menüyü açık tutar
        inlineCollapsed={collapsed}
      >
        <Menu.Item key="/" icon={<HomeOutlined />}>
          <Link to="/">Ana Sayfa</Link>
        </Menu.Item>

        <Menu.Item key="/gelirler" icon={<BarChartOutlined />}>
          <Link to="/gelirler">Gelirler</Link>
        </Menu.Item>

        {/* --- ÖNEMLİ DEĞİŞİKLİK: 'Giderler' artık bir alt menü --- */}
        <Menu.SubMenu key="giderlerSubMenu" icon={<DollarOutlined />} title="Giderler">
          {giderlerChildren.map(child => (
            <Menu.Item key={child.key} icon={child.icon}>
              {child.label}
            </Menu.Item>
          ))}
        </Menu.SubMenu>
        {/* ----------------------------------------------------------- */}

      </Menu>
    </Sider>
  );
}