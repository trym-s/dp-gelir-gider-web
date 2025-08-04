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
import { Switch, FormControlLabel } from '@mui/material';

const DailyRiskChart = ({ bank_id }) => {
  const [chartConfig, setChartConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAccounts, setShowAccounts] = useState(true);

  useEffect(() => {
    if (!bank_id) {
      setLoading(false);
      setError('Bank ID is not provided.');
      return;
    }

    const fetchChartData = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`/api/dashboard/charts/daily-risk/${bank_id}`);
        setChartConfig(response.data);
      } catch (err) {
        setError('Failed to load chart data.');
        console.error('Error fetching daily risk chart data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [bank_id]);

  if (loading) {
    return <div>Loading Chart...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!chartConfig || !chartConfig.data || chartConfig.data.length === 0) {
    return <div>No data available for this chart.</div>;
  }

  const { title, data, dataKey, lines } = chartConfig;

  const filteredLines = showAccounts ? lines : lines.filter(line => line.dataKey === 'total_risk');

  return (
    <div style={{ width: '100%', height: 350 }}>
      <h3>{title}</h3>
      <FormControlLabel
        control={<Switch checked={showAccounts} onChange={() => setShowAccounts(!showAccounts)} />}
        label="Hesapları Göster/Gizle"
      />
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
