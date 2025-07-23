import React, { useState } from 'react';
import { Tabs, Alert } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreditCardDashboard from './CreditCardDashboard';
import CreditCardsTable from './CreditCardsTable';
import CardTransactionsTable from './CardTransactionsTable';

const { TabPane } = Tabs;

const queryClient = new QueryClient();

const CreditCardsPage = () => {
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [activeTab, setActiveTab] = useState('1');

  const handleCardSelect = (cardId) => {
    setSelectedCardId(cardId);
    setActiveTab('3'); // Switch to the transactions tab
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ padding: '24px' }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="Kredi Kartlarım" key="1">
            <CreditCardDashboard />
          </TabPane>
          <TabPane tab="Kart Listesi" key="2">
            <CreditCardsTable onCardSelect={handleCardSelect} />
          </TabPane>
          <TabPane tab="Kart İşlemleri" key="3">
            {selectedCardId ? (
              <CardTransactionsTable cardId={selectedCardId} />
            ) : (
              <Alert
                message="Lütfen İşlemleri Görüntülemek İçin Bir Kart Seçin"
                description="Kart Listesi sekmesinden bir kartın üzerine tıklayarak o karta ait işlemleri burada görebilirsiniz."
                type="info"
                showIcon
              />
            )}
          </TabPane>
        </Tabs>
      </div>
    </QueryClientProvider>
  );
};

export default CreditCardsPage;
