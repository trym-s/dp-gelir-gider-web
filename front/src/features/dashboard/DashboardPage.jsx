// front/src/features/dashboard/DashboardPage.jsx

import React from 'react';
import { Row, Col } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SummaryCharts from "./summary/SummaryCharts";
import RecentTransactions from './activity-log/RecentTransactions'; // YENİ YOL
import CreditsSummary from './activity-log/CreditsSummary';       // YENİ YOL
import './styles/DashboardPage.css';

// Sayfa için bir QueryClient sağlayıcısı
const queryClient = new QueryClient();

const DashboardContent = () => {
  return (
    <Row gutter={[24, 24]}>
      {/* Sol Taraf: Geniş Grafik Alanı */}
      <Col xs={24} xl={18}>
        <SummaryCharts />
      </Col>

      {/* Sağ Taraf: Son İşlemler ve Kredi Özetleri */}
      <Col xs={24} xl={6}>
        <Row gutter={[24, 24]}>
          <Col span={24}>
            {/* 1. Bileşen: En son gelir ve gider işlemlerini gösterir */}
            <RecentTransactions />
          </Col>
          <Col span={24}>
            {/* 2. Bileşen: Krediler ve Kredi Kartları özetini sekmeli yapıda gösterir */}
            <CreditsSummary />
          </Col>
        </Row>
      </Col>
    </Row>
  );
};

// Ana bileşeni, veri çekme işlemleri için QueryClientProvider ile sarmalıyoruz.
export default function DashboardPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent />
    </QueryClientProvider>
  );
}