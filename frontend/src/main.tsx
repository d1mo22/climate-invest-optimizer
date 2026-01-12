// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConfigProvider, theme } from "antd";
import esES from "antd/locale/es_ES";

// Layouts y páginas
import AppLayout from "./layouts/AppLayout";
import Home from "./pages/Home";
import Map from "./pages/Map";
import Dashboards from "./pages/DashBoards";
import CountryDashboard from "./pages/CountryDashboard";
import CountryMap from "./pages/CountryMap";
import StoreDashboard from "./pages/StoreDashboard";

// Contextos
import { BudgetProvider } from "./context/BudgetContext";
import { StoresProvider } from "./context/StoresContext";

import "antd/dist/reset.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConfigProvider locale={esES} theme={{ algorithm: theme.darkAlgorithm }}>
      <BudgetProvider>
        <StoresProvider>
          <BrowserRouter>
            <Routes>
              {/* HOME sin layout (sin navbar) */}
              <Route path="/" element={<Home />} />

              {/* Todo lo demás con layout */}
              <Route path="/" element={<AppLayout />}>
                <Route path="map" element={<Map />} />
                <Route path="dashboards" element={<Dashboards />} />
                <Route path="dashboard/:slug" element={<CountryDashboard />} />
                <Route path="country/:slug" element={<CountryMap />} />
                <Route path="store/:storeSlug" element={<StoreDashboard />} />
              </Route>

              <Route path="*" element={<div style={{ color: "#fff" }}>404</div>} />
            </Routes>
          </BrowserRouter>
        </StoresProvider>
      </BudgetProvider>
    </ConfigProvider>
  </React.StrictMode>
);
