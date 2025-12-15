import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";

// Páginas
import Home from "./pages/Home";
import Map from "./pages/Map";
import Dashboards from "./pages/DashBoards";
import CountryMap from "./pages/CountryMap";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Todo cuelga de AppLayout */}
        <Route element={<AppLayout />}>
          <Route index element={<Home />} />                 {/* "/" */}
          <Route path="map" element={<Map />} />             {/* "/map" */}
          <Route path="dashboards" element={<Dashboards />} />{/* "/dashboards" */}
          <Route path="country/:slug" element={<CountryMap />} /> {/* "/country/:slug" */}
          <Route path="*" element={<div style={{ color: "#fff" }}>404</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
