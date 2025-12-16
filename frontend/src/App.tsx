import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";

import Home from "./pages/Home";
import Map from "./pages/Map";
import Dashboards from "./pages/DashBoards";
import CountryMap from "./pages/CountryMap";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Home SIN layout */}
        <Route path="/" element={<Home />} />

        {/* Map CON layout */}
        <Route path="/map" element={<AppLayout />}>
          <Route index element={<Map />} />
        </Route>

        {/* Dashboards CON layout */}
        <Route path="/dashboards" element={<AppLayout />}>
          <Route index element={<Dashboards />} />
        </Route>

        {/* Country CON layout */}
        <Route path="/country/:slug" element={<AppLayout />}>
          <Route index element={<CountryMap />} />
        </Route>

        {/* 404 (opcional) */}
        <Route path="*" element={<div style={{ color: "#fff" }}>404</div>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
