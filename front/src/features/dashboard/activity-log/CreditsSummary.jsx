// src/features/dashboard/activity-log/CreditsSummary.jsx

import React from 'react';
import { Collapse, Tabs, Spin, Alert, Empty, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getCreditCards } from '../../../api/creditCardService';
import { getLoans } from '../../../api/loanService';
import CreditCard from '../../credits/credit-cards/components/CreditCard';
import BankLoans from '../../credits/loans/BankLoans';
import { CreditCardOutlined } from '@ant-design/icons';
// --- STİL DOSYASI YOLU DÜZELTİLDİ VE DOĞRU STİL DOSYASI SEÇİLDİ ---
import styles from '../styles/ActivityLog.module.css';

const { TabPane } = Tabs;
const { Title } = Typography;

export default function CreditsSummary() {
  const { data: creditCards, isLoading: isLoadingCards, isError: isErrorCards } = useQuery({
    queryKey: ['creditCardsDashboard'],
    queryFn: getCreditCards,
    select: (response) => response.data
  });

  const { data: loans, isLoading: isLoadingLoans, isError: isErrorLoans } = useQuery({
    queryKey: ['loansDashboard'],
    queryFn: getLoans,
    select: (response) => response.data
  });

  const renderCreditCards = () => {
    if (isLoadingCards) return <div style={{ textAlign: 'center', padding: '20px' }}><Spin /></div>;
    if (isErrorCards) return <Alert message="Kredi kartları yüklenemedi." type="error" />;
    if (!creditCards || creditCards.length === 0) return <Empty description="Kredi kartı bulunmuyor." />;

    return (
      <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '8px' }}>
        {creditCards.map(card => <CreditCard key={card.id} card={card} isInteractive={false} />)}
      </div>
    );
  };

  const renderLoans = () => {
    if (isLoadingLoans) return <div style={{ textAlign: 'center', padding: '20px' }}><Spin /></div>;
    if (isErrorLoans) return <Alert message="Krediler yüklenemedi." type="error" />;
    return (
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
         <BankLoans />
      </div>
    );
  };

  // --- MODERN GÖRÜNÜM İÇİN YENİ BAŞLIK YAPISI ---
  const panelHeader = (
    <div className={styles.baslik}>
        <Title level={5} className={styles.baslikText}>
            <CreditCardOutlined />
            Krediler ve Kredi Kartları
        </Title>
    </div>
  );

  return (
    // Kartın etrafına bir sarmalayıcı ekleyerek genel stile uyum sağladık
    <div className={styles.sonIslemlerCard}>
        <Collapse ghost defaultActiveKey={[]} expandIconPosition="end">
            <Collapse.Panel 
                header={panelHeader} 
                key="1"
            >
                <Tabs defaultActiveKey="1" size="small">
                    <TabPane tab={`Kredi Kartları (${creditCards?.length || 0})`} key="1">
                        {renderCreditCards()}
                    </TabPane>
                    <TabPane tab={`Krediler (${loans?.length || 0})`} key="2">
                        {renderLoans()}
                    </TabPane>
                </Tabs>
            </Collapse.Panel>
        </Collapse>
    </div>
  );
}