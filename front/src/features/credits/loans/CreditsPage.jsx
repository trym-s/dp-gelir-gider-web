import React from 'react';
import { Tabs } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BankLoans from './BankLoans';
import LoanTypes from './LoanTypes';
import LoansTable from './LoansTable';
import './BankLoans.css';

const { TabPane } = Tabs;

// Create a single QueryClient instance for the entire page
const queryClient = new QueryClient();

const CreditsPage = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ padding: '24px' }}>
        <Tabs defaultActiveKey="1">
          <TabPane tab="Kredilerim" key="1">
            <BankLoans />
          </TabPane>
          <TabPane tab="Kredi Türleri" key="2">
            <LoanTypes />
          </TabPane>
          <TabPane tab="Genel Kredi Tablosu" key="3">
            <LoansTable />
          </TabPane>
        </Tabs>
      </div>
    </QueryClientProvider>
  );
};

export default CreditsPage;