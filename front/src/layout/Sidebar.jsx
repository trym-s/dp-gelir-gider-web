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
];

const rootSubmenuKeys = ['gelir-group', 'gider-group'];

export default function Sidebar({ collapsed, setCollapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [openKeys, setOpenKeys] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);

  useEffect(() => {
    const currentPath = location.pathname;
    const parentKey = menuItems.find(item =>
      item.children?.some(child => child.key === currentPath)
    )?.key;

    if (parentKey) {
      if (!collapsed) {
        setOpenKeys([parentKey]);
      }
      setSelectedKeys([currentPath, parentKey]);
    } else {
      setSelectedKeys([currentPath]);
      if (!collapsed) {
        setOpenKeys([]);
      }
    }
    
    if (collapsed) {
        setOpenKeys([]);
    }

  }, [collapsed, location.pathname]);

  const onOpenChange = (keys) => {
    const latestOpenKey = keys.find(key => openKeys.indexOf(key) === -1);
    if (rootSubmenuKeys.indexOf(latestOpenKey) === -1) {
      setOpenKeys(keys);
    } else {
      setOpenKeys(latestOpenKey ? [latestOpenKey] : []);
    }
  };

  // SubMenu açık olacak gruplar (sadece sidebar açıkken)
  const defaultOpenKeys = collapsed ? [] : ['gelirler', 'giderler'];

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



