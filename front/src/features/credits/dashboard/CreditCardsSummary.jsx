// /front/src/features/credits/dashboard/CreditCardsSummary.jsx
import React from 'react';
import { Card, Spin } from 'antd';

function CreditCardsSummary({ data, isLoading }) {
  if (isLoading) {
    return <Spin />;
  }

  const totalLimit = data?.reduce((acc, card) => acc + (parseFloat(card.credit_limit) || 0), 0) || 0;
  const totalDebt = data?.reduce((acc, card) => acc + (parseFloat(card.current_debt) || 0), 0) || 0;

  return (
    <Card title="Kredi Kartları Özeti">
      <p>Toplam Limit: {totalLimit.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      <p>Toplam Borç: {totalDebt.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    </Card>
  );
}

export default CreditCardsSummary;
