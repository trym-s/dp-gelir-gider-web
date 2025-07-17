import React, { useEffect, useState } from 'react';
import { Card, Spin, Alert, Select, Space } from 'antd';
import {
  ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell
} from 'recharts';
import { getIncomeGraphData, getIncomeDistributionData } from '../../../api/dashboardService';
import { MODERN_COLORS, CustomTooltip, INCOME_PALETTE } from './chartUtils';

const { Option } = Select;

const displayOptions = [
  { value: 'date_bar', label: 'Tarihe Göre (Bar)' },
  { value: 'pie_budget_item', label: 'Bütçe Kalemi (Pasta)' },
  { value: 'pie_region', label: 'Bölge (Pasta)' },
  { value: 'pie_account_name', label: 'Hesap Adı (Pasta)' },
  { value: 'pie_company', label: 'Firma (Pasta)' },
];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, percent, name, fill }) => {
  const radius = outerRadius + 25;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const truncatedName = name.length > 20 ? `${name.substring(0, 20)}...` : name;

  return (
    <text
      x={x}
      y={y}
      fill={fill}
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {`${truncatedName} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};

export default function IncomeChart({ startDate, endDate }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayType, setDisplayType] = useState(displayOptions[0].value);

  useEffect(() => {
    const fetchData = async () => {
      if (!startDate || !endDate) return;
      try {
        setLoading(true);
        setError(null);
        
        const parts = displayType.split('_');
        const chartType = parts[0];
        const groupBy = parts.slice(1).join('_');
        
        let result;
        if (chartType === 'date') {
          result = await getIncomeGraphData(startDate, endDate);
        } else {
          result = await getIncomeDistributionData(startDate, endDate, groupBy);
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
  }, [startDate, endDate, displayType]);

  const renderChart = () => {
    const chartType = displayType.split('_')[0];
    if (chartType === 'pie') {
      const pieData = data.filter(item => item.received > 0);
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart margin={{ top: 20, right: 60, bottom: 20, left: 60 }}>
            <Pie
              data={pieData}
              dataKey="received"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              fill={MODERN_COLORS.incomeMuted}
              paddingAngle={5}
              labelLine
              label={renderCustomizedLabel}
              stroke="#fff"
              strokeWidth={2}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={INCOME_PALETTE[index % INCOME_PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="received" stackId="a" fill={MODERN_COLORS.income} name="Alınan" />
          <Bar dataKey="remaining" stackId="a" fill={MODERN_COLORS.incomeRemaining} name="Kalan" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card 
      title="Gelir Analizi"
      bordered={false}
      className="summary-category-card"
      extra={
        <Space wrap>
          <Select value={displayType} onChange={setDisplayType} style={{ width: 200 }}>
            {displayOptions.map(opt => <Option key={opt.value} value={opt.value}>{opt.label}</Option>)}
          </Select>
        </Space>
      }
    >
      <Spin spinning={loading}>
        {error ? <Alert message={error} type="error" showIcon /> : <div style={{ height: 300 }}>{renderChart()}</div>}
      </Spin>
    </Card>
  );
}
