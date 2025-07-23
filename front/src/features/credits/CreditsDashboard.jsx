import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Spin, Alert, Statistic } from 'antd';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { getCreditCards } from '../../api/creditCardService';
import { formatCurrency } from '../../utils/formatter';
import LoanHistoryChart from './LoanHistoryChart'; // Yeni grafiği import et

const { Title } = Typography;

// Custom Tooltip for a better look
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const percentage = (data.payload.utilizationRate).toFixed(2);
    return (
      <div className="custom-tooltip" style={{ backgroundColor: '#fff', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <p className="label">{`Kullanım Oranı: ${percentage}%`}</p>
      </div>
    );
  }
  return null;
};


const FinancialHealthCard = ({ kpiData }) => {
  const { totalDebt, totalAvailableLimit, utilizationRate } = kpiData;

  const data = [
    { name: 'Kullanılan Bakiye', value: totalDebt, utilizationRate: utilizationRate },
    { name: 'Kullanılabilir Limit', value: totalAvailableLimit, utilizationRate: utilizationRate },
  ];

  const getUtilizationColor = (rate) => {
    if (rate <= 40) return '#52c41a'; // Green
    if (rate <= 70) return '#faad14'; // Yellow
    return '#f5222d'; // Red
  };

  const COLORS = [getUtilizationColor(utilizationRate), '#f0f2f5']; // Using Ant Design's background color for the unused part

  return (
    <Card bordered={false} style={{ textAlign: 'center', height: '100%' }}>
      <Title level={4}>Kredi Kartı Finansal Sağlık</Title>
      <div style={{ position: 'relative', height: 220, marginBottom: '20px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomTooltip />} />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={90}
              fill="#8884d8"
              paddingAngle={2}
              dataKey="value"
              startAngle={90}
              endAngle={450}
              cornerRadius={10}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <Statistic
            title="Kullanım Oranı"
            value={utilizationRate}
            precision={2}
            suffix="%"
            valueStyle={{ color: getUtilizationColor(utilizationRate), fontSize: '1.8em', fontWeight: 'bold' }}
          />
          <Statistic
            title="Toplam Borç"
            value={totalDebt}
            precision={2}
            formatter={(value) => <span style={{ fontSize: '0.9em', color: '#8c8c8c' }}>{formatCurrency(value)}</span>}
            
          />
        </div>
      </div>
       <Statistic
            title="Kullanılabilir Limit"
            value={totalAvailableLimit}
            precision={2}
            formatter={(value) => <span style={{ fontSize: '1em' }}>{formatCurrency(value)}</span>}
        />
    </Card>
  );
};


const CreditsDashboard = () => {
  const [kpiData, setKpiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCreditCardKPIs = async () => {
      try {
        setLoading(true);
        const response = await getCreditCards();
        const cards = response.data;
        
        if (!cards || !Array.isArray(cards) || cards.length === 0) {
            setKpiData({ totalDebt: 0, totalLimit: 0, totalAvailableLimit: 0, utilizationRate: 0 });
            setLoading(false);
            return;
        }

        const totalDebt = cards.reduce((sum, card) => sum + parseFloat(card.current_debt || 0), 0);
        const totalLimit = cards.reduce((sum, card) => sum + parseFloat(card.limit || 0), 0);
        const totalAvailableLimit = cards.reduce((sum, card) => sum + parseFloat(card.available_limit || 0), 0);
        const utilizationRate = totalLimit > 0 ? (totalDebt / totalLimit) * 100 : 0;

        setKpiData({ totalDebt, totalLimit, totalAvailableLimit, utilizationRate });
      } catch (err) {
        setError('Kredi kartı verileri yüklenirken bir hata oluştu.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCreditCardKPIs();
  }, []);

  if (loading) {
    return <Spin tip="Yükleniyor..." style={{ display: 'block', marginTop: '20px' }} />;
  }

  if (error) {
    return <Alert message="Hata" description={error} type="error" showIcon />;
  }

  return (
    <div>
      <Title level={2} style={{ marginBottom: '24px' }}>Kredi Paneli</Title>
      <Row gutter={[24, 24]}>
        {/* Financial Health KPI */}
        <Col xs={24} sm={24} md={24} lg={8} xl={7}>
          {kpiData && <FinancialHealthCard kpiData={kpiData} />}
        </Col>
        
        {/* Loan History Chart */}
        <Col xs={24} sm={24} md={24} lg={16} xl={17}>
          <LoanHistoryChart />
        </Col>
      </Row>
    </div>
  );
};

export default CreditsDashboard;
