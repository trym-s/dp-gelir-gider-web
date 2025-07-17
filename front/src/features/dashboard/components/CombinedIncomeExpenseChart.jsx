import React, { useEffect, useState } from 'react';
import { Card, Spin, Alert } from 'antd';
import {
  ResponsiveContainer, BarChart, Bar,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line
} from 'recharts';
import { getCombinedIncomeExpenseData } from '../../../api/dashboardService';
import { MODERN_COLORS, CustomTooltip } from './chartUtils';

export default function CombinedIncomeExpenseChart({ viewMode, currentDate }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getCombinedIncomeExpenseData(currentDate, viewMode);
        setData(result.map(item => ({
          ...item,
          difference: item.income - item.expense
        })));
      } catch (err) {
        setError('Grafik verileri yüklenemedi.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentDate, viewMode]);

  if (error) return <Alert message={error} type="error" showIcon />;

  return (
    <Card title="Aylık Gelir & Gider Karşılaştırması" bordered={false}>
      <Spin spinning={loading}>
        <div style={{ height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(val) => `${val / 1000}k`} tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
              <Legend />
              <Bar dataKey="income" fill={MODERN_COLORS.income} name="Gelir" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill={MODERN_COLORS.expense} name="Gider" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="difference" stroke={MODERN_COLORS.difference} strokeWidth={2} name="Fark" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Spin>
    </Card>
  );
}