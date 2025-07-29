// src/features/banks/charts/FinancialHealthCard.jsx
import React from 'react';
import GenericHealthCard from './GenericHealthCard'; // Adjust path as needed
import { formatCurrency } from '../../../utils/formatter'; // Assuming this path is correct

const FinancialHealthCard = ({ creditCards }) => {
  const totalDebt = creditCards.reduce((sum, card) => sum + parseFloat(card.current_debt || 0), 0);
  const totalLimit = creditCards.reduce((sum, card) => sum + parseFloat(card.limit || 0), 0);
  const totalAvailableLimit = creditCards.reduce((sum, card) => sum + parseFloat(card.available_limit || 0), 0);
  const utilizationRate = totalLimit > 0 ? (totalDebt / totalLimit) * 100 : 0;

  const getUtilizationColor = (rate) => {
    if (rate <= 40) return '#8fc674ff'; // Green
    if (rate <= 70) return '#d7b46cff'; // Yellow
    return '#d86066ff'; // Red
  };

  const chartData = [
    { name: 'Kullanılan Bakiye', value: totalDebt, utilizationRate: utilizationRate },
    { name: 'Kullanılabilir Limit', value: totalAvailableLimit, utilizationRate: utilizationRate },
  ];

  const config = {
    title: 'Kredi Kartı Finansal Sağlık',
    mainStatisticLabel: 'Kullanım Oranı',
    mainStatisticValue: utilizationRate,
    mainStatisticSuffix: '%',
    mainStatisticColor: getUtilizationColor(utilizationRate),
    mainStatisticFormatter: (value) => <span style={{ fontSize: '1.5em', fontWeight: 'bold' }}>{value.toFixed(2)}</span>,
    chartData: chartData,
    chartColors: [getUtilizationColor(utilizationRate), '#f0f2f5'],
    valueFormatter: (value) => `${value.toFixed(2)}%`, // For tooltip
    kpis: [
      { label: 'Toplam Borç', value: totalDebt, formatter: (value) => <span style={{ fontSize: '0.9em', color: '#8c8c8c' }}>{formatCurrency(value)}</span> },
      { label: 'Kullanılabilir Limit', value: totalAvailableLimit, formatter: (value) => <span style={{ fontSize: '0.9em' }}>{formatCurrency(value)}</span> },
    ],
    showEmptyState: true,
    emptyMessage: 'Kredi kartı verisi bulunmamaktadır.',
    totalLimit: totalLimit // Pass for empty state logic
  };

  return <GenericHealthCard data={creditCards} config={config} />;
};

export default FinancialHealthCard;