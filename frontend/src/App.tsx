// src/App.tsx
import { Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Map from "./pages/Map";
import DashBoards from "./pages/DashBoards";

function App() {
  return (
    <div style={{ padding: "1rem" }}>
      <nav style={{ marginBottom: "1rem" }}>
        <Link to="/">🏠 Home</Link> | <Link to="/map">🗺️ Map</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/map" element={<Map />} />
        <Route path="/dashboards" element={<DashBoards />} />
      </Routes>
    </div>
  );
}

export default App;
