import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button } from 'antd';
import {
  HomeOutlined,
  BarChartOutlined,
  DollarOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
  PieChartOutlined,
  ContainerOutlined,
  CreditCardOutlined,
  SettingOutlined,
  BankOutlined, // İkonu import et
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import './Sidebar.css';

const { Sider } = Layout;

const menuItems = [
  { key: '/dashboard', icon: <HomeOutlined />, label: 'Ana Sayfa' },
  {
    key: 'gelir-group',
    label: 'Gelirler',
    icon: <BarChartOutlined />,
    children: [
      { key: '/gelirler', label: 'Gelir Listesi', icon: <ContainerOutlined /> },
      { key: '/fatura-raporu', label: 'Fatura Raporu', icon: <PieChartOutlined /> },
      { key: '/gelir-pivot', label: 'Gelir Raporu', icon: <PieChartOutlined /> },
    ],
  },
  {
    key: 'gider-group',
    label: 'Giderler',
    icon: <DollarOutlined />,
    children: [
      { key: '/giderler', label: 'Gider Listesi', icon: <ContainerOutlined /> },
      { key: '/gider-pivot', label: 'Gider Raporu', icon: <PieChartOutlined /> },
    ],
  },
  { key: '/bankalar', icon: <BankOutlined />, label: 'Banka Paneli' },
  { key: '/yonetim', icon: <SettingOutlined />, label: 'Yönetim Paneli' },
  {
    key: 'krediler-group',
    label: 'Krediler',
    icon: <CreditCardOutlined />,
    children: [
        { key: '/krediler', icon: <DollarOutlined />, label: 'Krediler' },
        { key: '/kredi-kartlari', icon: <CreditCardOutlined />, label: 'Kredi Kartları' },
        { key: '/kredi-karti-pivot', icon: <PieChartOutlined />, label: 'Kredi Kartı Pivot' },
    ],
  },
  {
    key: 'banka-islemleri-group',
    label: 'Banka İşlemleri',
    icon: <BankOutlined />,
    children: [
        { key: '/banka-kayitlari', icon: <ContainerOutlined />, label: 'Banka Kayıtları' },
        { key: '/banka-durumu', icon: <PieChartOutlined />, label: 'Banka Durumu' },
        { key: '/kmh-durumu', icon: <BarChartOutlined />, label: 'KMH Durumu' },
    ],
  },
];

const rootSubmenuKeys = ['gelir-group', 'gider-group', 'krediler-group', 'banka-islemleri-group'];

export default function Sidebar({ collapsed, setCollapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [openKeys, setOpenKeys] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);

  useEffect(() => {
    const currentPath = location.pathname;
    // Find the parent submenu key for the current path
    const parentKey = menuItems.find(item =>
      item.children?.some(child => child.key === currentPath)
    )?.key;

    // Set the selected key to be just the current path
    setSelectedKeys([currentPath]);

    // If there is a parent, make sure its submenu is open when not collapsed
    if (parentKey && !collapsed) {
      setOpenKeys([parentKey]);
    } else if (!parentKey && !collapsed) {
      // If it's a top-level item, close other submenus
      setOpenKeys([]);
    }

    // Collapse should always close all submenus
    if (collapsed) {
      setOpenKeys([]);
    }
  }, [location.pathname, collapsed]);

  const onOpenChange = (keys) => {
    const latestOpenKey = keys.find(key => openKeys.indexOf(key) === -1);
    if (rootSubmenuKeys.indexOf(latestOpenKey) === -1) {
      setOpenKeys(keys);
    } else {
      setOpenKeys(latestOpenKey ? [latestOpenKey] : []);
    }
  };

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      width={200}
      collapsedWidth={80}
      trigger={null}
      className="main-sidebar"
    >
      <div className="sidebar-header">
        {collapsed ? (
          <img src="/dp_logo.png" alt="Logo" className="sidebar-logo small" />
        ) : (
          <img src="/dp_long_logo.png" alt="Logo" className="sidebar-logo long" />
        )}
      </div>
      <Button
        type="text"
        icon={collapsed ? <DoubleRightOutlined /> : <DoubleLeftOutlined />}
        onClick={() => setCollapsed(!collapsed)}
        className="sidebar-trigger"
      />
      <Menu
        mode="inline"
        theme="dark"
        selectedKeys={selectedKeys}
        openKeys={openKeys}
        onOpenChange={onOpenChange}
        inlineCollapsed={collapsed}
        className="sidebar-menu"
      >
        {menuItems.map(item =>
          item.children ? (
            <Menu.SubMenu
              key={item.key}
              icon={item.icon}
              title={item.label}
            >
              {item.children.map(child => (
                <Menu.Item
                  key={child.key}
                  icon={child.icon}
                  onClick={() => navigate(child.key)}
                >
                  {child.label}
                </Menu.Item>
              ))}
            </Menu.SubMenu>
          ) : (
            <Menu.Item
              key={item.key}
              icon={item.icon}
              onClick={() => navigate(item.key)}
            >
              {item.label}
            </Menu.Item>
          )
        )}
      </Menu>
    </Sider>
  );
}