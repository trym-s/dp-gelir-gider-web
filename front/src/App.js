// App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Layout
import MainLayout from "./layout/MainLayout";

// Feature Pages (Yeni yollar ve isimlendirme standartlarımızla)
import LoginPage from "./features/auth/LoginPage";
import DashboardPage from "./features/dashboard/DashboardPage";
//import IncomesListPage from "./features/incomes/IncomesListPage";
//import ExpensesListPage from "./features/expenses/ExpensesListPage";
import IncomeList from "./features/incomes/IncomeList";
import ExpenseList from "./features/expenses/ExpenseList";

// Context
import { AuthProvider, useAuth } from "./context/AuthContext";

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
            <Route path="gelirler" element={<IncomeList />} />
            <Route path="giderler" element={<ExpenseList />} />
            
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