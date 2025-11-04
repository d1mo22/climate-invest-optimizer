// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConfigProvider, theme } from "antd";
import esES from "antd/locale/es_ES";
import AppLayout from "./layouts/AppLayout";
import Home from "./pages/Home";
import Map from "./pages/Map";
import Dashboards from "./pages/DashBoards";
import "antd/dist/reset.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConfigProvider locale={esES} theme={{ algorithm: theme.darkAlgorithm }}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/map" element={<Map />} />
            <Route path="/dashboards" element={<Dashboards />} />
            <Route path="*" element={<div style={{ color: "#fff" }}>404</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>
);
