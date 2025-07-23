// /front/src/features/credits/dashboard/LoansSummary.jsx
import React from 'react';
import { Card, Spin } from 'antd';

function LoansSummary({ data, isLoading }) {
  if (isLoading) {
    return <Spin />;
  }

  const totalLoanAmount = data?.reduce((acc, loan) => acc + (parseFloat(loan.amount) || 0), 0) || 0;
  const remainingPrincipal = data?.reduce((acc, loan) => acc + (parseFloat(loan.remaining_principal) || 0), 0) || 0;

  return (
    <Card title="Krediler Özeti">
      <p>Toplam Kredi Tutarı: {totalLoanAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      <p>Kalan Anapara: {remainingPrincipal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    </Card>
  );
}

export default LoansSummary;
