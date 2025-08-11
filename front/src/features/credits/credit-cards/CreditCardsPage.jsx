import React, { useState } from 'react';
import { Tabs, Alert, message } from 'antd';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import CreditCardDashboard from './CreditCardDashboard';
import CreditCardsTable from './CreditCardsTable';
import CardTransactionsTable from './CardTransactionsTable';

const { TabPane } = Tabs;

const queryClient = new QueryClient();

const PageContent = () => {
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [activeTab, setActiveTab] = useState('1');
  const [refreshKey, setRefreshKey] = useState(0);
  const queryClient = useQueryClient();

  const handleCardSelect = (cardId) => {
    setSelectedCardId(cardId);
    setActiveTab('3'); // Switch to the transactions tab
  };

  const handleImportSuccess = () => {
    message.success('İşlemler başarıyla içe aktarıldı! Veriler güncelleniyor...');
    queryClient.invalidateQueries({ queryKey: ['creditCards'] });
    queryClient.invalidateQueries({ queryKey: ['cardTransactions'] });
    setRefreshKey(prevKey => prevKey + 1);
  };

  return (
    <div style={{ padding: '24px' }}>
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Kredi Kartlarım" key="1">
          <CreditCardDashboard refreshKey={refreshKey} onCardsUpdate={handleImportSuccess} />
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
  );
}

const CreditCardsPage = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <PageContent />
    </QueryClientProvider>
  );
};

export default CreditCardsPage;