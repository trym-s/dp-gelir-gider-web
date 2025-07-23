// /front/src/features/credits/dashboard/BankLogsSummary.jsx
import React from 'react';
import { Card, Spin } from 'antd';

function BankLogsSummary({ data, isLoading }) {
  if (isLoading) {
    return <Spin />;
  }

  const totals = {
    total_try: data?.reduce((acc, b) => acc + (parseFloat(b.amount_try) || 0), 0) || 0,
    total_usd: data?.reduce((acc, b) => acc + (parseFloat(b.amount_usd) || 0), 0) || 0,
    total_eur: data?.reduce((acc, b) => acc + (parseFloat(b.amount_eur) || 0), 0) || 0,
  };

  return (
    <Card title="Banka Hesap Özeti">
      <p>Toplam TRY: {totals.total_try.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      <p>Toplam USD: {totals.total_usd.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      <p>Toplam EUR: {totals.total_eur.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    </Card>
  );
}

export default BankLogsSummary;
