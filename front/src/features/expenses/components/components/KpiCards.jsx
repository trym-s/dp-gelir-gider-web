// front/src/features/expenses/components/import-wizard/components/KpiCards.jsx
import React from "react";
import { Row, Col, Card, Statistic } from "antd";
import { fmtTL } from "../utils";

export default function KpiCards({ count, totalAmount, totalPaid, missingAccount }) {
  return (
    <Row gutter={12}>
      <Col span={6}><Card><Statistic title="Seçili Fatura" value={count} /></Card></Col>
      <Col span={6}><Card><Statistic title="Toplam Tutar (KDV dahil)" value={fmtTL(totalAmount)} /></Card></Col>
      <Col span={6}><Card><Statistic title="Toplam Ödenen" value={fmtTL(totalPaid)} /></Card></Col>
      <Col span={6}><Card><Statistic title="Eksik Hesap" value={missingAccount} /></Card></Col>
    </Row>
  );
}
