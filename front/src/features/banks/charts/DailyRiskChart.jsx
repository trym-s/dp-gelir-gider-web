import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Spin, Alert, Switch, Space } from 'antd';  

const DailyRiskChart = ({ bank_id, selectedAccountId }) => {
  const [chartConfig, setChartConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAccounts, setShowAccounts] = useState(true);

  const chartContainerStyle = {
    height: 350,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  useEffect(() => {
    if (!bank_id) {
      setLoading(false);
      setError('Bank ID is not provided.');
      return;
    }

    const fetchChartData = async () => {
      setLoading(true);
      try {
        const params = {};
        if (selectedAccountId) {
          params.bank_account_id = selectedAccountId;
        }
        const response = await axios.get(`/api/dashboard/charts/daily-risk/${bank_id}`, { params });
        setChartConfig(response.data);
      } catch (err) {
        setError('Failed to load chart data.');
        console.error('Error fetching daily risk chart data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [bank_id, selectedAccountId]);

  if (loading) {
    return (
      <div style={chartContainerStyle}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={chartContainerStyle}>
        <Alert message="Hata" description={error} type="error" showIcon />
      </div>
    );
  }

  if (!chartConfig || !chartConfig.data || chartConfig.data.length === 0) {
    return (
      <div style={chartContainerStyle}>
        <p>Bu grafik için veri bulunamadı.</p>
      </div>
    );
  }

  const { title, data, dataKey, lines } = chartConfig;

  const filteredLines = showAccounts ? lines : lines.filter(line => line.dataKey === 'total_risk');

  return (
    <div style={{ width: '100%', height: 350 }}>
      <Space>
        <Switch checked={showAccounts} onChange={setShowAccounts} />
        <span>Hesapları Göster/Gizle</span>
      </Space>
      <ResponsiveContainer>
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={dataKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          {filteredLines && filteredLines.map((line) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.stroke}
              name={line.name}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DailyRiskChart;
