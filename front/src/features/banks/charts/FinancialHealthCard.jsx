import React, { useEffect, useState } from 'react';
import GenericHealthCard from './GenericHealthCard';
import axios from 'axios';

const FinancialHealthCard = () => {
  const [chartConfig, setChartConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChartConfig = async () => {
      try {
        const response = await axios.get('/api/dashboard/charts/financial-health');
        setChartConfig(response.data);
      } catch (err) {
        setError('Chart data could not be loaded.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchChartConfig();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!chartConfig) {
    return null;
  }

  return <GenericHealthCard config={chartConfig} />;
};

export default FinancialHealthCard;