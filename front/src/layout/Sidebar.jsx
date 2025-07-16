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
import './Sidebar.css';
import { Tooltip } from 'antd'; // Eklemeyi unutma!
const { Sider } = Layout;

export default function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation();
  const navigate = useNavigate();

  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.startsWith('/gelirler')) return '/gelirler';
    if (path.startsWith('/gelir-pivot')) return '/gelir-pivot';
    if (path.startsWith('/giderler')) return '/giderler';
    if (path.startsWith('/gider-pivot')) return '/gider-pivot';
    return '/';
  };

  // SubMenu açık olacak gruplar (sadece sidebar açıkken)
  const defaultOpenKeys = collapsed ? [] : ['gelirler', 'giderler'];

  return (
    <>
      <Sider
        collapsible
        collapsed={collapsed}
        width={200}
        collapsedWidth={60}
        theme="dark"
        trigger={null}
        style={{ minHeight: '100vh', position: 'fixed', left: 0, top: 0, bottom: 0 }}
      >
        {/* Logo + Menü buraya */}
        <div className="sidebar-header">
          <div className="logo-container" onClick={() => navigate('/')}>
            {!collapsed ? (
              <img src="/dp_logo_full.png" alt="Logo" className="logo-wide" />
            ) : (
              <img src="/dp_logo.png" alt="Logo" className="logo-icon" />
            )}
          </div>
        </div>

        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[getSelectedKey()]}
          defaultOpenKeys={defaultOpenKeys}
          inlineCollapsed={collapsed}
        >
          <Menu.Item key="/" icon={<HomeOutlined />} title="Ana Sayfa">
            <Link to="/">Ana Sayfa</Link>
          </Menu.Item>

          <Menu.SubMenu key="gelirler" icon={<BarChartOutlined />} title="Gelirler">
            <Menu.Item key="/gelirler">
              <Link to="/gelirler">Gelir Listesi</Link>
            </Menu.Item>
            <Menu.Item key="/gelir-pivot">
              <Link to="/gelir-pivot">Gelir Raporları</Link>
            </Menu.Item>
          </Menu.SubMenu>

          <Menu.SubMenu key="giderler" icon={<DollarOutlined />} title="Giderler">
            <Menu.Item key="/giderler">
              <Link to="/giderler">Gider Listesi</Link>
            </Menu.Item>
            <Menu.Item key="/gider-pivot">
              <Link to="/gider-pivot">Gider Raporları</Link>
            </Menu.Item>
          </Menu.SubMenu>
        </Menu>
      </Sider>

      {/* Sabit pozisyonda aç/kapa butonu */}
      <Button
        type="text"
        icon={collapsed ? <DoubleRightOutlined /> : <DoubleLeftOutlined />}
        onClick={() => setCollapsed(!collapsed)}
        className="sidebar-floating-trigger"
      />
    </>
  );

}
