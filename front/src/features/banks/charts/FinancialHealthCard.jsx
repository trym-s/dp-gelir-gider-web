import React, { useEffect, useState } from 'react';
import GenericHealthCard from './GenericHealthCard';
import axios from 'axios';
import { Spin, Alert } from 'antd';

const FinancialHealthCard = ({ bank_id, selectedAccountId }) => {
  const [chartConfig, setChartConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!bank_id) {
        setLoading(false);
        setError('Bank ID is not provided.');
        return;
    }

    const fetchChartConfig = async () => {
      setLoading(true);
      try {
        const params = {};
        if (selectedAccountId) {
            params.bank_account_id = selectedAccountId;
        }
        const response = await axios.get(`/api/dashboard/charts/financial-health/${bank_id}`, { params });
        setChartConfig(response.data);
      } catch (err) {
        setError('Chart data could not be loaded.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchChartConfig();
  }, [bank_id, selectedAccountId]);

  if (loading) {
    return <Spin style={{ display: 'block', margin: '20px auto' }} />;
  }

  if (error) {
    return <Alert message="Hata" description={error} type="error" showIcon />;
  }

  if (!chartConfig) {
    return null;
  }

  return <GenericHealthCard config={chartConfig} />;
};

export default FinancialHealthCard;
