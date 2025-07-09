import { Layout, Menu } from 'antd';
import {
  HomeOutlined,
  BarChartOutlined,
  UserOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';

const { Sider } = Layout;

export default function Sidebar() {
  const location = useLocation();

  return (
    <Sider width={220} theme="dark" breakpoint="lg" collapsedWidth="0">
      <div className="logo" style={{ color: 'white', textAlign: 'center', padding: '12px', fontSize: '18px' }}>
        <img src="/dp_logo.png" alt="Logo" className="logo" />
      </div>

      <Menu
        mode="inline"
        theme="dark"
        selectedKeys={[location.pathname]}
        defaultOpenKeys={['gelirler', 'giderler']}
      >
        <Menu.Item key="/" icon={<HomeOutlined />}>
          <Link to="/">Ana Sayfa</Link>
        </Menu.Item>

        <Menu.SubMenu key="gelirler" icon={<BarChartOutlined />} title="Gelirler">
          <Menu.Item key="/gelirler/liste">
            <Link to="/gelirler/liste">Gelir Listesi</Link>
          </Menu.Item>
          <Menu.Item key="/gelirler/sirketler">
            <Link to="/gelirler/sirketler">Şirketler</Link>
          </Menu.Item>
          <Menu.Item key="/gelirler/rapor">
            <Link to="/gelirler/rapor">Gelir Raporu</Link>
          </Menu.Item>
        </Menu.SubMenu>

        <Menu.SubMenu key="giderler" icon={<DollarOutlined />} title="Giderler">
          <Menu.Item key="/giderler/liste">
            <Link to="/giderler/liste">Gider Listesi</Link>
          </Menu.Item>
          <Menu.Item key="/giderler/rapor">
            <Link to="/giderler/rapor">Gider Raporu</Link>
          </Menu.Item>
        </Menu.SubMenu>
      </Menu>
    </Sider>
  );
}
