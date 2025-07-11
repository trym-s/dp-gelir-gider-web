import { Layout, Menu, Tooltip, Dropdown } from 'antd';
import {
  HomeOutlined,
  BarChartOutlined,
  DollarOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
  FileTextOutlined,
  TeamOutlined,
  PieChartOutlined,
  WalletOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import './Sidebar.module.css';
import { useNavigate } from 'react-router-dom';
const { Sider } = Layout;

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const forceOpenKeys = collapsed ? ['gelirler', 'giderler'] : [];

  const gelirItems = [
    {
      key: '/incomes/liste',
      icon: <FileTextOutlined />,
      label: 'Gelir Listesi',
      path: '/incomes/liste',
    },
    {
      key: '/incomes/firmalar',
      icon: <TeamOutlined />,
      label: 'Firmalar',
      path: '/incomes/firmalar',
    },
    {
      key: '/incomes/rapor',
      icon: <PieChartOutlined />,
      label: 'Gelir Raporu',
      path: '/incomes/rapor',
    },
  ];


  const giderItems = [
    {
      key: '/expenses/liste',
      icon: <FileTextOutlined />,
      label: 'Gider Listesi',
      path: '/expenses/liste',
    },
    {
      key: '/expenses/rapor',
      icon: <WalletOutlined />,
      label: 'Gider Raporu',
      path: '/expenses/rapor',
    },
  ];
  <Menu.Item key="/IncomeExpenseReport/rapor" icon={<LineChartOutlined />}>
    <Link to="IncomeExpenseReport/rapor">Gelir Gider Raporu</Link>
  </Menu.Item>

  const navigate = useNavigate();
  const renderSubMenuItem = (items) => (
    <Menu style={{ borderRadius: 6 }}>
      {items.map(({ key, icon, label, path }) => (
        <Menu.Item
          key={key}
          icon={icon}
          onClick={() => navigate(path)}
          title="" // burada boş veriyoruz ki browser tooltip engellensin
        >
          {label}
        </Menu.Item>
      ))}
    </Menu>
  );

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      width={220}
      collapsedWidth={80}
      theme="dark"
      trigger={null}
      style={{ minHeight: '100vh' }}
    >
      {/* Logo – tıklanınca anasayfaya yönlendirir */}
      <div
        style={{ textAlign: 'center', margin: '16px 0', cursor: 'pointer' }}
        onClick={() => navigate('/')}
      >
        <img
          src="/dp_logo.png"
          alt="Logo"
          className="logo-hover"
          style={{ width: collapsed ? '40px' : '80px', transition: 'width 0.3s' }}
        />
      </div>


      {/* MENÜYÜ SAKLA */}
      <div
        style={{
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          height: 48,
          color: '#fff',
          fontWeight: 500,
          cursor: 'pointer',
        }}
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <DoubleRightOutlined /> : (
          <>
            <DoubleLeftOutlined style={{ marginRight: 8 }} />
            <span>MENÜYÜ SAKLA</span>
          </>
        )}
      </div>

      {/* Menü */}
      <Menu
        mode="inline"
        theme="dark"
        selectedKeys={[location.pathname]}
        defaultOpenKeys={['gelirler', 'giderler']}
        openKeys={forceOpenKeys.length > 0 ? forceOpenKeys : undefined}
        style={{ marginTop: 12 }}
      >
        <Menu.Item key="/" icon={<HomeOutlined />}>
          <Link to="/">Ana Sayfa</Link>
        </Menu.Item>

        {collapsed ? (
          <>
            <Dropdown overlay={renderSubMenuItem(gelirItems)} placement="rightTop" trigger={['click']}>
              <div className="sidebar-icon-hover">
                <Tooltip title="Gelirler" placement="right">
                  <BarChartOutlined style={{ fontSize: 18 }} />
                </Tooltip>
              </div>
            </Dropdown>

            <Dropdown overlay={renderSubMenuItem(giderItems)} placement="rightTop" trigger={['click']}>
              <div className="sidebar-icon-hover">
                <Tooltip title="Giderler" placement="right">
                  <DollarOutlined style={{ fontSize: 18 }} />
                </Tooltip>
              </div>
            </Dropdown>
          </>
        ) : (
          <>
            <Menu.SubMenu key="gelirler" icon={<BarChartOutlined />} title="Gelirler">
              {gelirItems.map(({ key, icon, label, path }) => (
                <Menu.Item key={key} icon={icon}>
                  <Link to={path} title={undefined}>{label}</Link>
                </Menu.Item>
              ))}
            </Menu.SubMenu>

            <Menu.SubMenu key="giderler" icon={<DollarOutlined />} title="Giderler">
              {giderItems.map(({ key, icon, label, path }) => (
                <Menu.Item key={key} icon={icon}>
                  <Link to={path} title={undefined}>{label}</Link>
                </Menu.Item>
              ))}
            </Menu.SubMenu>
          </>
        )}

        {/* 🔽 Yeni Sayfa – Gelir Gider Raporu */}
        <Menu.Item key="/gelirgider/rapor" icon={<LineChartOutlined />}>
          <Link to="/gelirgider/rapor">Gelir Gider Raporu</Link>
        </Menu.Item>
      </Menu>

    </Sider>
  );
}
