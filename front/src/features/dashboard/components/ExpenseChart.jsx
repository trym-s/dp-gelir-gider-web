import React, { useState } from 'react';
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
} from 'recharts';
import { Button } from 'antd';

// Örnek mock veriler
const mockDailyData = [
  { date: '2025-07-10', paid: 1200, remaining: 800 },
  { date: '2025-07-11', paid: 1400, remaining: 600 },
  { date: '2025-07-12', paid: 1000, remaining: 1000 },
  { date: '2025-07-13', paid: 1300, remaining: 700 },
  { date: '2025-07-14', paid: 1100, remaining: 900 },
];

const mockByTypeData = [
  { type: 'Kira', amount: 12000 },
  { type: 'Elektrik', amount: 9000 },
  { type: 'Personel', amount: 15000 },
  { type: 'Ofis', amount: 7000 },
];

const mockMonthlyData = [
  { month: '2025-01', income: 10000, expense: 8000 },
  { month: '2025-02', income: 12000, expense: 9500 },
  { month: '2025-03', income: 15000, expense: 10000 },
  { month: '2025-04', income: 13000, expense: 11000 },
  { month: '2025-05', income: 16000, expense: 12500 },
];

export default function ExpenseChart({ dateRange, viewMode }) {
  const [showPaid, setShowPaid] = useState(true);
  const [showRemaining, setShowRemaining] = useState(true);
  const [activeTab, setActiveTab] = useState('daily'); // 'daily', 'type', 'combined'

  const renderChart = () => {
    if (activeTab === 'daily') {
      const lines = [
        showPaid && <Line key="paid" type="monotone" dataKey="paid" stroke="green" name="Ödenen" />, 
        showRemaining && <Line key="remaining" type="monotone" dataKey="remaining" stroke="orange" name="Ödenecek" />
      ].filter(Boolean);

      return (
        <>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
            <span
              style={{
                cursor: 'pointer',
                fontWeight: showPaid ? 'bold' : 'normal',
                color: 'green',
                textDecoration: showPaid ? 'underline' : 'none'
              }}
              onClick={() => setShowPaid(prev => !prev)}
            >
              ● Ödenen
            </span>
            <span
              style={{
                cursor: 'pointer',
                fontWeight: showRemaining ? 'bold' : 'normal',
                color: 'orange',
                textDecoration: showRemaining ? 'underline' : 'none'
              }}
              onClick={() => setShowRemaining(prev => !prev)}
            >
              ● Ödenecek
            </span>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mockDailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => `${value.toLocaleString()} ₺`} />
              <Legend />
              {lines}
            </LineChart>
          </ResponsiveContainer>
        </>
      );
    }

    if (activeTab === 'type') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={mockByTypeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="type" />
            <YAxis />
            <Tooltip formatter={(value) => `${value.toLocaleString()} ₺`} />
            <Legend />
            <Bar dataKey="amount" fill="#8884d8" name="Tutar" />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (activeTab === 'combined') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={mockMonthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => `${value.toLocaleString()} ₺`} />
            <Legend />
            <Bar dataKey="income" fill="#00bcd4" name="Gelir" />
            <Bar dataKey="expense" fill="#3f51b5" name="Gider" />
            <Line type="monotone" dataKey={d => d.income - d.expense} stroke="red" name="Fark" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      );
    }
  };

  return (
    <>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <Button type={activeTab === 'daily' ? 'primary' : 'default'} onClick={() => setActiveTab('daily')}>Gider Grafiği</Button>
        <Button type={activeTab === 'type' ? 'primary' : 'default'} onClick={() => setActiveTab('type')}>Bütçe Kalemine Göre</Button>
        <Button type={activeTab === 'combined' ? 'primary' : 'default'} onClick={() => setActiveTab('combined')}>Gelir-Gider Tablosu</Button>
      </div>
      {renderChart()}
    </>
  );
}
