import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar,
  CartesianGrid, XAxis, YAxis,
  Tooltip, Legend,
} from 'recharts';
import { getIncomeGraphData } from '../../../api/dashboardService';
import { Spin, Alert } from 'antd';

export default function IncomeChart({ viewMode, currentDate, chartType }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await getIncomeGraphData(currentDate, viewMode);
        setData(res);
        setError(null);
      } catch (err) {
        setError("Gelir verisi yüklenemedi.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentDate, viewMode]);

  if (loading) return <Spin />;
  if (error) return <Alert message={error} type="error" />;

  const renderStackedBar = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" />
        <YAxis />
        <Tooltip formatter={(val) => `${val.toLocaleString()} ₺`} />
        <Legend />
        <Bar dataKey="received" stackId="a" fill="#00C49F" name="Alınan" />
        <Bar dataKey="remaining" stackId="a" fill="#FFBB28" name="Alınacak" />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderCombinedChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" />
        <YAxis />
        <Tooltip formatter={(val) => `${val.toLocaleString()} ₺`} />
        <Legend />
        <Bar dataKey="income" fill="#00C49F" name="Gelir" />
        <Bar dataKey="expense" fill="#3f51b5" name="Gider" />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderPieChart = () => <div>Pie chart geçici olarak devre dışı.</div>;

  const renderChart = () => {
    switch (chartType) {
      case 'stacked': return renderStackedBar();
      case 'combined': return renderCombinedChart();
      case 'pie': return renderPieChart();
      default: return <div>Grafik tipi tanımsız.</div>;
    }
  };

  return <>{renderChart()}</>;
}
