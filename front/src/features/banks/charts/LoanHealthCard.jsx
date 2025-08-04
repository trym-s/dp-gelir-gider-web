// src/features/banks/charts/LoanHealthCard.jsx
import React from 'react';
import GenericHealthCard from './GenericHealthCard'; // Adjust path as needed
import { formatCurrency } from "../../../utils/formatter"; // Assuming this path is correct

const LoanHealthCard = ({ loanSummary }) => {
  const totalLoanAmount = loanSummary?.total_loan_principal || 0;
  const paidAmount = loanSummary?.total_paid_amount ?? (totalLoanAmount - (loanSummary?.total_loan_debt || 0));
  const totalLoanDebt = loanSummary?.total_loan_debt ?? (totalLoanAmount - (loanSummary?.total_paid_amount || 0));

  const getLoanStatusColor = (debt, total) => {
    if (total === 0) return '#f0f2f5';
    const ratio = debt / total;
    if (ratio <= 0.2) return '#8fc674ff';
    if (ratio <= 0.5) return '#d7b46cff';
    return '#d86066ff';
  };

  const chartData = [
    { name: 'Kalan Borç', value: totalLoanDebt },
    { name: 'Ödenen Tutar', value: paidAmount },
  ];

  const config = {
    title: 'Kredi Sağlığı',
    mainStatisticLabel: 'Toplam Kredi Borcu',
    mainStatisticValue: totalLoanDebt,
    mainStatisticSuffix: '',
    mainStatisticColor: getLoanStatusColor(totalLoanDebt, totalLoanAmount),
    mainStatisticFormatter: (value) => <span style={{ fontSize: '1.1em', fontWeight: 'bold' }}>{formatCurrency(value)}</span>,
    chartData: chartData,
    chartColors: [getLoanStatusColor(totalLoanDebt, totalLoanAmount), '#f0f2f5'],
    valueFormatter: formatCurrency, // For tooltip
    kpis: [
      { label: 'Ödenen Tutar', value: paidAmount, formatter: (value) => <span style={{ fontSize: '0.9em', color: '#8c8c8c' }}>{formatCurrency(value)}</span> },
      { label: 'Toplam Kredi Miktarı', value: totalLoanAmount, formatter: (value) => <span style={{ fontSize: '0.9em' }}>{formatCurrency(value)}</span> },
    ],
    showEmptyState: true,
    emptyMessage: 'Kredi verisi bulunmamaktadır.',
    showWarningState: true,
    warningMessage: 'Toplam kredi miktarı bilgisi eksik olduğu için grafik gösterilemiyor.',
    totalLoanAmount: totalLoanAmount // Pass for empty and warning state logic
  };

  return <GenericHealthCard data={loanSummary} config={config} />;
};

export default LoanHealthCard;
