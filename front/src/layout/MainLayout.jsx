import React, { useState } from 'react';
import { Layout } from "antd";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { Outlet } from "react-router-dom";

const { Content } = Layout;

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);

  const siderWidth = collapsed ? 80 : 220;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <Layout style={{ marginLeft: siderWidth, transition: 'margin-left 0.2s' }}>
        <Header />
        <Content style={{ margin: "24px 16px 0", overflow: 'initial' }}>
          <div style={{ padding: 24, background: '#fff', minHeight: 'calc(100vh - 88px)' }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
