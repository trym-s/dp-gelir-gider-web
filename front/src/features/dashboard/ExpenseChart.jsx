import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
// import { getExpenseGraphData, getExpenseDistributionData } from '../../../api/dashboardService';
import CombinedIncomeExpenseChart from './CombinedIncomeExpenseChart';
const COLORS = ['#4CAF50', '#FF9800']; // Ödenen, Ödenecek

export default function ExpenseChart({ viewMode, currentDate, chartType }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    // ✅ Mock veri (gerçek API yerine kullanılacak)
    const mockMonthlyData = [
      { date: '2025-03', paid: 70000, remaining: 15000, budget_item_name: 'Kira' },
      { date: '2025-04', paid: 65000, remaining: 22000, budget_item_name: 'Elektrik' },
      { date: '2025-05', paid: 90000, remaining: 10000, budget_item_name: 'Personel' },
      { date: '2025-06', paid: 80000, remaining: 18000, budget_item_name: 'Kırtasiye' },
      { date: '2025-07', paid: 95000, remaining: 5000,  budget_item_name: 'Bakım' },
    ];

    setData(mockMonthlyData);

    // async function fetchData() {
    //   let result;
    //   if (chartType === 'pie') {
    //     result = await getExpenseDistributionData(currentDate);
    //   } else {
    //     result = await getExpenseGraphData(currentDate, viewMode);
    //   }
    //   setData(result);
    // }
    // fetchData();
  }, [chartType, currentDate, viewMode]);

  const renderPieChart = () => {
    const pieData = data.map((item) => ({
      name: item.budget_item_name,
      value: item.paid + item.remaining,
      paid: item.paid,
      remaining: item.remaining,
    }));

    const outerData = pieData.flatMap((item) => [
      { name: `${item.name} - Ödenen`, value: item.paid },
      { name: `${item.name} - Ödenecek`, value: item.remaining },
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

  const renderStackedBar = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip formatter={(value) => `${value.toLocaleString()} ₺`} />
        <Legend />
        <Bar dataKey="paid" stackId="a" fill={COLORS[0]} name="Ödenen" />
        <Bar dataKey="remaining" stackId="a" fill={COLORS[1]} name="Ödenecek" />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderLineChart = () => <CombinedIncomeExpenseChart />;

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
