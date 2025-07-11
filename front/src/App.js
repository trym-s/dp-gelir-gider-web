// App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Layout
import MainLayout from "./layout/MainLayout";
import LoginPage from "./features/auth/LoginPage";
import DashboardPage from "./features/dashboard/DashboardPage";

import GelirListesi from "./features/incomes/GelirListesi";
import Firmalar from "./features/incomes/Firmalar";
import FirmaEkle from "./features/incomes/FirmaEkle";
import GelirRaporu from "./features/incomes/GelirRaporu";
import GelirEkle from "./features/incomes/GelirEkle";
import ExpensesList from "./features/expenses/ExpensesList";
import GiderRaporu from "./features/expenses/GiderRaporu";
import IncomeExpenseReport from "./features/IncomeExpenseReport";
// Context
import { AuthProvider, useAuth } from "./context/AuthContext";

import dayjs from "dayjs";
import "dayjs/locale/tr";
import "dayjs/locale/en";
import { getLocaleConfig } from "./utils/regionLocaleMap";
// REGION bilgisi backend'den localStorage'a geldi varsayılıyor
const region = parseInt(localStorage.getItem("region")) || 1;
const { dayjsLocale, antdLocale } = getLocaleConfig(region);
dayjs.locale(dayjsLocale);

/**
 * Kullanıcının giriş yapıp yapmadığını kontrol eden ve
 * MainLayout'u saran korumalı bir rota bileşeni.
 */
function ProtectedLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    // Kullanıcı giriş yapmamışsa, login sayfasına yönlendir.
    // 'replace' prop'u, tarayıcı geçmişinde gereksiz bir kayıt oluşmasını engeller.
    return <Navigate to="/users/login" replace />;
  }

  // Kullanıcı giriş yapmışsa, Sidebar ve Header'ı içeren
  // MainLayout'u ve onun altındaki ilgili sayfayı (<Outlet />) göster.
  return <MainLayout />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* 1. Public Route: Herkesin erişebileceği Login sayfası */}
          {/* Klasör yapımıza uygun olarak path'i güncelledim. */}
          <Route path="/users/login" element={<LoginPage />} />

          {/* 2. Protected Routes: Sadece giriş yapmış kullanıcıların erişebileceği sayfalar */}
          {/* Tüm korumalı rotaları tek bir parent altında topluyoruz. */}
          <Route path="/" element={<ProtectedLayout />}>
            {/* Ana dizine ("/") gelindiğinde direkt dashboard'a yönlendir. */}
            <Route index element={<Navigate to="/dashboard" replace />} />

            <Route path="dashboard" element={<DashboardPage />} />
  {/*          <Route path="incomes" element={<IncomesListPage />} /> 
            <Route path="expenses" element={<ExpensesListPage />} />  */}
            <Route path="incomes/liste" element={<GelirListesi />} />
            <Route path="incomes/ekle" element={<GelirEkle />} />
            <Route path="incomes/firmalar" element={<Firmalar />} />
            <Route path="incomes/firmaEkle" element={<FirmaEkle />} />
            <Route path="incomes/rapor" element={<GelirRaporu />} />
            <Route path="/expenses/liste" element={<ExpensesList />} />     
            <Route path="expenses/rapor" element={<GiderRaporu />} />
            <Route path="IncomeExpenseReport/rapor" element={<IncomeExpenseReport />} />
            {/* Gelecekte eklenecek diğer rotalar: */}
            {/* <Route path="incomes/:id" element={<IncomeDetailPage />} /> */}
            {/* <Route path="expenses/:id" element={<ExpenseDetailPage />} /> */}
            {/* <Route path="reports" element={<ReportsPage />} /> */}
          </Route>

           {/* 3. Catch-all Route: Eşleşmeyen bir yola gidilirse ana sayfaya yönlendir. */}
           <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;