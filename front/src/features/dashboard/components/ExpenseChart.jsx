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
  ComposedChart,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { getExpenseGraphData } from '../../../api/dashboardService';

const COLORS = ['#4CAF50', '#FF9800']; // Ödenen, Ödenecek

export default function ExpenseChart({ viewMode, currentDate, chartType }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const result = await getExpenseGraphData(currentDate, viewMode);
      setData(result);
    }
    fetchData();
  }, [viewMode, currentDate]);

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
        <XAxis dataKey={viewMode === 'monthly' ? 'month' : viewMode === 'weekly' ? 'date' : 'date'} />
        <YAxis />
        <Tooltip formatter={(value) => `${value.toLocaleString()} ₺`} />
        <Legend />
        <Bar dataKey="paid" stackId="a" fill={COLORS[0]} name="Ödenen" />
        <Bar dataKey="remaining" stackId="a" fill={COLORS[1]} name="Ödenecek" />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip formatter={(value) => `${value.toLocaleString()} ₺`} />
        <Legend />
        <Line type="monotone" dataKey="paid" stroke="green" name="Ödenen" />
        <Line type="monotone" dataKey="remaining" stroke="orange" name="Ödenecek" />
      </LineChart>
    </ResponsiveContainer>
  );

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
