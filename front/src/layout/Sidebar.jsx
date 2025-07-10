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

        <Menu.Item key="/gelirler" icon={<BarChartOutlined />}>
          <Link to="/gelirler">Gelirler</Link>
        </Menu.Item>

        <Menu.SubMenu key="giderler" icon={<DollarOutlined />} title="Giderler">
          <Menu.Item key="/giderler">
            <Link to="/giderler">Gider Listesi</Link>
          </Menu.Item>
          <Menu.Item key="/giderler/rapor">
            <Link to="/giderler/rapor">Gider Raporu</Link>
          </Menu.Item>
        </Menu.SubMenu>
      </Menu>
    </Sider>
  );
}
