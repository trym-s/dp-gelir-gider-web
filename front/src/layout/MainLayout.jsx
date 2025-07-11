import { Layout } from "antd";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { Outlet } from "react-router-dom";

const { Content } = Layout;

export default function MainLayout() {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sidebar />
      <Layout>
        <Header />
        <Content style={{ margin: "20px" }}>
          <Outlet /> {/* ← burası dinamik içerik */}
        </Content>
      </Layout>
    </Layout>
  );
}
