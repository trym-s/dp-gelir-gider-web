import React from "react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { App as AntApp } from 'antd';
import MainLayout from "./layout/MainLayout";
import LoginPage from "./features/auth/LoginPage";
import DashboardPage from "./features/dashboard/DashboardPage";
import IncomeList from "./features/incomes/IncomeList";
import ExpenseList from "./features/expenses/ExpenseList";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DashboardProvider, useDashboard } from "./context/DashboardContext";
import { ExpenseDetailProvider } from "./context/ExpenseDetailContext";
import { IncomeDetailProvider } from "./context/IncomeDetailContext";
import IncomePivot from "./features/incomes/IncomePivot";
import ExpensePivot from "./features/expenses/ExpensePivot";
import CreditCardDashboard from "./features/credits/credit-cards/CreditCardDashboard";
import CreditCardsPage from "./features/credits/credit-card-logs/CreditCardsPage";
import BankLogs from "./features/credits/bank-logs/Screen2";
import BankStatusPage from "./features/tests/BankStatusPage";
import CreditsPage from "./features/credits/loans/CreditsPage";
import BanksDashboardPage from "./features/banks/BanksDashboardPage";
import ManagementPage from "./features/management/ManagementPage";
import KMHStatusPage from "./features/kmh/KMHStatusPage";

function ProtectedLayout() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <MainLayout />;
}



const queryClient = new QueryClient();

function App() {
  return (
    <AuthProvider>
      <AntApp>
        <DashboardProvider>
          <QueryClientProvider client={queryClient}>
            <AppContent />
          </QueryClientProvider>
        </DashboardProvider>
      </AntApp>
    </AuthProvider>
  );
}

function AppContent() {
  const { triggerRefresh } = useDashboard();

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route 
            path="dashboard" 
            element={
              <ExpenseDetailProvider onExpenseUpdate={triggerRefresh}>
                <IncomeDetailProvider onIncomeUpdate={triggerRefresh}>
                  <DashboardPage />
                </IncomeDetailProvider>
              </ExpenseDetailProvider>
            } 
          />
          <Route path="gelirler" element={<IncomeList />} />
          <Route path="giderler" element={<ExpenseList />} />
          <Route path="gelir-pivot" element={<IncomePivot />} />
          <Route path="gider-pivot" element={<ExpensePivot />} />
          <Route path="kredi-kartlari" element={<CreditCardDashboard />} />
          <Route path="kredi-karti-pivot" element={<CreditCardsPage />} />
          <Route path="banka-kayitlari" element={<BankLogs />} />
          <Route path="banka-durumu" element={<BankStatusPage />} />
          <Route path="krediler" element={<CreditsPage />} />
          
          <Route path="bankalar" element={<BanksDashboardPage />} />
          <Route path="yonetim" element={<ManagementPage />} />
          <Route path="kmh-durumu" element={<KMHStatusPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;