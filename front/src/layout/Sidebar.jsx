import React, { useState, useEffect , useMemo } from 'react';
import { Layout, Menu, Button } from 'antd';
import {
  HomeOutlined,
  BarChartOutlined,
  DollarOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
  PieChartOutlined,
  ContainerOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import './Sidebar.css';
import { useAuth } from '../context/AuthContext';

const { Sider } = Layout;

const allMenuItems  = [
  { key: '/dashboard', icon: <HomeOutlined />, label: 'Ana Sayfa' },
  {
    key: 'gelir-group',
    label: 'Gelirler',
    icon: <BarChartOutlined />,
    children: [
      { key: '/gelirler', label: 'Gelir Listesi', icon: <ContainerOutlined /> },
      { key: '/gelir-raporu', label: 'Fatura Raporu', icon: <PieChartOutlined /> },
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
  { // YENİ: Admin Paneli için menü öğesi
    key: '/admin/roles',
    label: 'Yetki Yönetimi',
    icon: <SettingOutlined />,
    permission: 'admin:roles:read',
  }, 
];

const rootSubmenuKeys = ['gelir-group', 'gider-group'];

export default function Sidebar({ collapsed, setCollapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAuth();
  const [openKeys, setOpenKeys] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);

  const filteredMenuItems = useMemo(() => {
    const filterItems = (items) => {
      return items.reduce((acc, item) => {
        // Eğer öğenin alt menüleri varsa, önce onları filtrele
        if (item.children) {
          const filteredChildren = filterItems(item.children);
          // Eğer görülebilecek en az bir alt menü varsa, ana menüyü de göster
          if (filteredChildren.length > 0) {
            acc.push({ ...item, children: filteredChildren });
          }
        } 
        // Eğer öğenin izni varsa veya hiç izin tanımlanmamışsa göster
        else if (!item.permission || hasPermission(item.permission)) {
          acc.push(item);
        }
        return acc;
      }, []);
    };
    return filterItems(allMenuItems);
  }, [hasPermission]);

  useEffect(() => {
    const currentPath = location.pathname;
    // Parent key'i bulma mantığı artık filtrelenmiş menüye göre çalışmalı
    const parentKey = filteredMenuItems.find(item =>
      item.children?.some(child => child.key === currentPath)
    )?.key;

    if (parentKey) {
      if (!collapsed) setOpenKeys([parentKey]);
      setSelectedKeys([currentPath, parentKey]);
    } else {
      setSelectedKeys([currentPath]);
      if (!collapsed) setOpenKeys([]);
    }
    
    if (collapsed) {
        setOpenKeys([]);
    }

  }, [collapsed, location.pathname, filteredMenuItems]);


  const onOpenChange = (keys) => {
    const latestOpenKey = keys.find(key => openKeys.indexOf(key) === -1);
    if (rootSubmenuKeys.indexOf(latestOpenKey) === -1) {
      setOpenKeys(keys);
    } else {
      setOpenKeys(latestOpenKey ? [latestOpenKey] : []);
    }
  };

  const handleMenuClick = (e) => {
    navigate(e.key);
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
        onClick={handleMenuClick} // onClick event'ini Menu'ye taşımak daha standarttır
        items={filteredMenuItems} // YENİ: Artık filtrelenmiş menüyü kullanıyoruz
        className="sidebar-menu"
      />
    </Sider>
  );
}



