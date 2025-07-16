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
} from 'recharts';

// Örnek mock veri
const mockData = [
  { date: '2025-07-10', received: 3000, remaining: 1500 },
  { date: '2025-07-11', received: 3500, remaining: 1000 },
  { date: '2025-07-12', received: 2500, remaining: 2000 },
  { date: '2025-07-13', received: 2800, remaining: 1800 },
  { date: '2025-07-14', received: 3200, remaining: 1200 },
];

export default function IncomeChart({ dateRange, viewMode }) {
  const [showReceived, setShowReceived] = useState(true);
  const [showRemaining, setShowRemaining] = useState(true);

  const filteredLines = [
    showReceived && <Line key="received" type="monotone" dataKey="received" stroke="green" name="Alınan" />,
    showRemaining && <Line key="remaining" type="monotone" dataKey="remaining" stroke="orange" name="Alınacak" />,
  ].filter(Boolean);

  return (
    <>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
        <span
          style={{
            cursor: 'pointer',
            fontWeight: showReceived ? 'bold' : 'normal',
            color: 'green',
            textDecoration: showReceived ? 'underline' : 'none'
          }}
          onClick={() => setShowReceived(prev => !prev)}
        >
          ● Alınan
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
          ● Alınacak
        </span>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={mockData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => {
              if (viewMode === 'daily') {
                return new Intl.DateTimeFormat('tr-TR', {
                  day: '2-digit',
                  month: 'short'
                }).format(new Date(date));
              }
              return date;
            }}
          />
          <YAxis />
          <Tooltip formatter={(value) => `${value.toLocaleString()} ₺`} />
          <Legend />
          {filteredLines}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}
