// src/layouts/AppLayout.tsx
import React from "react";
import { Layout, Menu } from "antd";
import { Link, Outlet, useLocation } from "react-router-dom";

const { Header, Content } = Layout;

export default function AppLayout() {
  const { pathname } = useLocation();

  const items = [
    { key: "/", label: <Link to="/">Home</Link> },
    { key: "/map", label: <Link to="/map">Map</Link> },
    { key: "/dashboards", label: <Link to="/dashboards">Dashboards</Link> },
  ];

  // Selecciona la pestaña según la URL actual
  const selectedKey =
    items.find(i => pathname === i.key || pathname.startsWith(i.key + "/"))?.key ?? "/";

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{ display: "flex", alignItems: "center" }}>
        <div style={{ color: "#fff", fontWeight: 700, marginRight: 16 }}>Climate Invest</div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={items}
          style={{ flex: 1 }}
        />
      </Header>

      <Content style={{ padding: 16 }}>
        {/* Aquí se renderizan tus páginas */}
        <Outlet />
      </Content>
    </Layout>
  );
}
