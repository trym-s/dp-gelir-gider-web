import React, { useState } from 'react';
import { Layout } from "antd";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { Outlet } from "react-router-dom";
import './MainLayout.css';

const { Content } = Layout;

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);

  const siderWidth = collapsed ? 60 : 200;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <Layout style={{ marginLeft: siderWidth, transition: 'margin-left 0.2s', background: 'var(--primary-color-dark)' }}>
        <Header />
        <Content style={{ overflow: 'initial' }}>
          <div className="content-layout">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
