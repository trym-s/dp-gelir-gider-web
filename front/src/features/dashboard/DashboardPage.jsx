// src/features/dashboard/DashboardPage.jsx

import React, { useState } from 'react';
import { Row, Col } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Yönlendirme için useNavigate hook'unu import ediyoruz
import { useNavigate } from 'react-router-dom';

// Bileşenleri import ediyoruz
import SummaryCharts from "./summary/SummaryCharts";
import Reminders from './activity-log/Reminders';
import RecentTransactions from './activity-log/RecentTransactions';
import CreditsSummary from './activity-log/CreditsSummary';
import './styles/DashboardPage.css';

// DEĞİŞİKLİK: Artık modal'ları bu sayfada import etmiyoruz.
// import DailyEntryModal from '../features/current_status/DailyEntryModal';
// import KMHDailyEntryModal from '../features/kmh/KMHDailyEntryModal';
// import CreditCardDailyEntryModal from '../features/credits/credit-card-logs/CreditCardDailyEntryModal';

const queryClient = new QueryClient();

const DashboardContent = () => {
  const navigate = useNavigate();

  // ESKİ HALİNE DÖNÜYORUZ: Modal'ın görünürlüğünü bu ana bileşen kontrol edecek.
  const [isTransactionModalVisible, setIsTransactionModalVisible] = useState(false);

  const handleReminderAction = (reminder) => {
    const entryType = reminder.meta?.entry_type;
    if (!entryType) {
      console.error("Yönlendirme başarısız! Hatırlatma objesinde 'meta.entry_type' bulunamadı.");
      return;
    }
    switch (entryType) {
      case 'bank_log': navigate('/banka-kayitlari'); break;
      case 'balance': navigate('/banka-durumu'); break;
      case 'kmh': navigate('/kmh-durumu'); break;
      case 'cclimit': navigate('/kredi-karti-pivot'); break;
      default: console.log("Henüz yönlendirmesi tanımlanmamış eylem:", reminder); break;
    }
  };

  return (
    <>
      <Row gutter={[24, 24]}>
        <Col xs={24} xl={18}>
          <SummaryCharts />
        </Col>
        <Col xs={24} xl={6}>
          <Row gutter={[24, 24]}>
            <Col span={24}>
              {/* RecentTransactions'a modal'ı kontrol etmesi için gerekli prop'ları tekrar gönderiyoruz */}
              <RecentTransactions
                isModalVisible={isTransactionModalVisible}
                onOpenModal={() => setIsTransactionModalVisible(true)}
                onCloseModal={() => setIsTransactionModalVisible(false)}
              />
            </Col>
            <Col span={24}>
              <Reminders onReminderAction={handleReminderAction} />
            </Col>
            <Col span={24}>
              <CreditsSummary />
            </Col>
          </Row>
        </Col>
      </Row>
    </>
  );
};

export default function DashboardPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent />
    </QueryClientProvider>
  );
}