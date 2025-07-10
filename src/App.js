import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { ConfigProvider } from "antd";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import "dayjs/locale/en";

import MainLayout from "./layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";

import GelirListesi from "./pages/Gelirler/GelirListesi";
import Firmalar from "./pages/Gelirler/Firmalar";
import FirmaEkle from "./pages/Gelirler/FirmaEkle";
import GelirRaporu from "./pages/Gelirler/GelirRaporu";
import GiderListesi from "./pages/Giderler/GiderListesi";
import GiderRaporu from "./pages/Giderler/GiderRaporu";
import GelirEkle from "./pages/Gelirler/GelirEkle";
import GelirGiderRaporu from "./pages/GelirGiderRaporu";

import { getLocaleConfig } from "./utils/regionLocaleMap";

// REGION bilgisi backend'den localStorage'a geldi varsayılıyor
const region = parseInt(localStorage.getItem("region")) || 1;
const { dayjsLocale, antdLocale } = getLocaleConfig(region);
dayjs.locale(dayjsLocale);

// Giriş yapılmış mı kontrolü
const ProtectedRoute = () => {
  const isAuthenticated = localStorage.getItem("token");
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <ConfigProvider locale={antdLocale}>
      <BrowserRouter>
        <Routes>
          {/* Login sayfası her zaman erişilebilir */}
          <Route path="/login" element={<Login />} />

          {/* Giriş yapılmamışsa yönlendirme çalışır */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/Gelirler/liste" element={<GelirListesi />} />
              <Route path="/Gelirler/ekle" element={<GelirEkle />} />
              <Route path="/Gelirler/firmalar" element={<Firmalar />} />
              <Route path="/Gelirler/firmaEkle" element={<FirmaEkle />} />
              <Route path="/Gelirler/rapor" element={<GelirRaporu />} />
              <Route path="/Giderler/liste" element={<GiderListesi />} />
              <Route path="/Giderler/rapor" element={<GiderRaporu />} />
              <Route path="/gelirgider/rapor" element={<GelirGiderRaporu />} />
            </Route>
          </Route>

          {/* Diğer her şeyi login'e yönlendir */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
