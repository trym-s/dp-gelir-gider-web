import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar,
  CartesianGrid, XAxis, YAxis,
  Tooltip, Legend,
  LineChart, Line,
  PieChart, Pie, Cell
} from 'recharts';
// import { getIncomeGraphData } from '../../../api/dashboardService';
import CombinedIncomeExpenseChart from './CombinedIncomeExpenseChart';

const COLORS = ['#00C49F', '#FFBB28']; // Alınan, Alınacak

export default function IncomeChart({ viewMode, currentDate, chartType }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    // ✅ Mock veri
    const mockData = [
      { date: '2025-03', received: 100000, remaining: 15000, budget_item_name: 'Satış' },
      { date: '2025-04', received: 95000, remaining: 8000, budget_item_name: 'Hizmet' },
      { date: '2025-05', received: 110000, remaining: 5000, budget_item_name: 'Destek' },
      { date: '2025-06', received: 120000, remaining: 10000, budget_item_name: 'Danışmanlık' },
      { date: '2025-07', received: 130000, remaining: 7000, budget_item_name: 'Diğer' },
    ];
    setData(mockData);

    // async function fetchData() {
    //   const res = await getIncomeGraphData(currentDate, viewMode);
    //   setData(res);
    // }
    // fetchData();
  }, [viewMode, currentDate, chartType]);

  const renderStackedBar = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip formatter={(val) => `${val.toLocaleString()} ₺`} />
        <Legend />
        <Bar dataKey="received" stackId="a" fill={COLORS[0]} name="Alınan" />
        <Bar dataKey="remaining" stackId="a" fill={COLORS[1]} name="Alınacak" />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderLineChart = () => <CombinedIncomeExpenseChart />;

  const renderPieChart = () => {
    const pieData = data.map((item) => ({
      name: item.budget_item_name,
      value: item.received + item.remaining,
      received: item.received,
      remaining: item.remaining,
    }));

    const outerData = pieData.flatMap((item) => [
      { name: `${item.name} - Alınan`, value: item.received },
      { name: `${item.name} - Alınacak`, value: item.remaining },
    ]);

    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={60}
            fill="#8884d8"
            label
          />
          <Pie
            data={outerData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            fill="#82ca9d"
            label
          >
            {outerData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? COLORS[0] : COLORS[1]} />
            ))}
          </Pie>
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const renderChart = () => {
    switch (chartType) {
      case 'pie':
        return renderPieChart();
      case 'stacked':
        return renderStackedBar();
      case 'line':
        return renderLineChart();
      default:
        return <div>Grafik tipi tanımsız.</div>;
    }
  };

  return <>{renderChart()}</>;
}
