import React from 'react';
import {
  ResponsiveContainer, BarChart, Bar,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line
} from 'recharts';

const data = [
  { date: '2025-03', income: 120000, expense: 85000 },
  { date: '2025-04', income: 95000, expense: 67000 },
  { date: '2025-05', income: 110000, expense: 90000 },
  { date: '2025-06', income: 125000, expense: 105000 },
  { date: '2025-07', income: 130000, expense: 115000 }
].map(item => ({
  ...item,
  difference: item.income - item.expense
}));

export default function CombinedIncomeExpenseChart() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip formatter={(val) => `${val.toLocaleString()} ₺`} />
        <Legend />
        <Bar dataKey="income" fill="#4CAF50" name="Gelir" />
        <Bar dataKey="expense" fill="#3f51b5" name="Gider" />
        <Line type="monotone" dataKey="difference" stroke="#f44336" strokeWidth={2} name="Fark" />
      </BarChart>
    </ResponsiveContainer>
  );
}
