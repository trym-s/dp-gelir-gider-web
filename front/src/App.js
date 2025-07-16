import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { App as AntApp } from 'antd';
import MainLayout from "./layout/MainLayout";
import LoginPage from "./features/auth/LoginPage";
import DashboardPage from "./features/dashboard/DashboardPage";
import IncomeList from "./features/incomes/IncomeList";
import ExpenseList from "./features/expenses/ExpenseList";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ExpenseDetailProvider } from "./context/ExpenseDetailContext";
import { IncomeDetailProvider } from "./context/IncomeDetailContext";
import GelirRaporu from "./features/incomes/GelirRaporu";
import GiderRaporu from "./features/expenses/GiderRaporu";

function ProtectedLayout() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <MainLayout />;
}

function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const handleRefresh = () => setRefreshKey(prevKey => prevKey + 1);

  return (
    <AuthProvider>
      <AntApp>
        <ExpenseDetailProvider onExpenseUpdate={handleRefresh}>
          <IncomeDetailProvider onIncomeUpdate={handleRefresh}>
            <Router>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<ProtectedLayout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage key={refreshKey} />} />
                  <Route path="gelirler" element={<IncomeList />} />
                  <Route path="giderler" element={<ExpenseList />} />
                  <Route path="gelir-pivot" element={<GelirRaporu />} />
                  <Route path="gider-pivot" element={<GiderRaporu/>} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </IncomeDetailProvider>
        </ExpenseDetailProvider>
      </AntApp>
    </AuthProvider>
  );
}

export default App;
