import React, { useEffect, useState } from 'react';
import { Card, Spin, Alert } from 'antd';
import {
  ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell
} from 'recharts';
import { getExpenseGraphData, getExpenseDistributionData } from '../../../api/dashboardService';
import CombinedIncomeExpenseChart from './CombinedIncomeExpenseChart';
import { MODERN_COLORS, CustomTooltip, EXPENSE_PALETTE } from './chartUtils';

export default function ExpenseChart({ viewMode, currentDate, chartType }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        let result;
        if (chartType === 'pie') {
          result = await getExpenseDistributionData(currentDate);
        } else {
          result = await getExpenseGraphData(currentDate, viewMode);
        }
        setData(result);
      } catch (err) {
        setError('Grafik verileri yüklenemedi.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [chartType, currentDate, viewMode]);

  const renderPieChart = () => {
    const pieData = data.map(item => ({
      name: item.budget_item_name,
      value: item.paid + item.remaining,
    }));

    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            fill={MODERN_COLORS.expenseMuted}
            paddingAngle={5}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={EXPENSE_PALETTE[index % EXPENSE_PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const renderStackedBar = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(val) => `${val / 1000}k`} tick={{ fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
        <Legend />
        <Bar dataKey="paid" stackId="a" fill={MODERN_COLORS.expense} name="Ödenen" radius={[4, 4, 0, 0]} />
        <Bar dataKey="remaining" stackId="a" fill={MODERN_COLORS.remaining} name="Ödenecek" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderLineChart = () => <CombinedIncomeExpenseChart viewMode={viewMode} currentDate={currentDate} />;

  const renderChart = () => {
    if (error) return <Alert message={error} type="error" showIcon />;

    let title = '';
    let chartComponent;

    switch (chartType) {
      case 'pie':
        title = 'Giderlerin Bütçe Kalemine Göre Dağılımı';
        chartComponent = renderPieChart();
        break;
      case 'stacked':
        title = 'Tarihe Göre Gider Dağılımı';
        chartComponent = renderStackedBar();
        break;
      case 'line':
        return renderLineChart();
      default:
        return <div>Grafik tipi tanımsız.</div>;
    }

    return (
      <Card title={title} bordered={false}>
        <Spin spinning={loading}>
          <div style={{ height: 300 }}>{chartComponent}</div>
        </Spin>
      </Card>
    );
  };

  return renderChart();
}