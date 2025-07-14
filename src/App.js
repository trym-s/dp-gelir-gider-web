import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import MainLayout from "./layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";

import GelirListesi from "./pages/Gelirler/GelirListesi";
import Sirketler from "./pages/Gelirler/Sirketler";
import GelirRaporu from "./pages/Gelirler/GelirRaporu";
import GiderListesi from "./pages/Giderler/GiderListesi";
import GiderRaporu from "./pages/Giderler/GiderRaporu";
import GiderEkle from "./pages/Giderler/GiderEkle"; 

// Giriş yapılmış mı kontrolü
const ProtectedRoute = () => {
  const isAuthenticated = localStorage.getItem("token");
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login sayfası her zaman erişilebilir */}
        <Route path="/login" element={<Login />} />

        {/* Giriş yapılmamışsa yönlendirme çalışır */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/Gelirler/liste" element={<GelirListesi />} />
            <Route path="/Gelirler/sirketler" element={<Sirketler />} />
            <Route path="/Gelirler/rapor" element={<GelirRaporu />} />
            <Route path="/Giderler/liste" element={<GiderListesi />} />
            <Route path="/Giderler/rapor" element={<GiderRaporu />} />
            <Route path="/Giderler/ekle" element={<GiderEkle />} />
          </Route>
        </Route>

        {/* Diğer her şeyi login'e yönlendir */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
