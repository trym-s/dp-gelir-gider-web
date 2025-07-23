import React from 'react';
import { Tabs } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreditCardDashboard from './CreditCardDashboard';
import CreditCardsTable from './CreditCardsTable';

const { TabPane } = Tabs;

const queryClient = new QueryClient();

const CreditCardsPage = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ padding: '24px' }}>
        <Tabs defaultActiveKey="1">
          <TabPane tab="Kredi Kartlarım" key="1">
            <CreditCardDashboard />
          </TabPane>
          <TabPane tab="Tablo" key="2">
            <CreditCardsTable />
          </TabPane>
        </Tabs>
      </div>
    </QueryClientProvider>
  );
};

export default CreditCardsPage;
