import React from 'react';
import { Card, Typography, Statistic } from 'antd';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '../../../../utils/formatter';

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


const FinancialHealthCard = ({ creditCards }) => {
  // Calculate KPIs from the provided creditCards prop
  const totalDebt = creditCards.reduce((sum, card) => sum + parseFloat(card.current_debt || 0), 0);
  const totalLimit = creditCards.reduce((sum, card) => sum + parseFloat(card.limit || 0), 0);
  const totalAvailableLimit = creditCards.reduce((sum, card) => sum + parseFloat(card.available_limit || 0), 0);
  const utilizationRate = totalLimit > 0 ? (totalDebt / totalLimit) * 100 : 0;

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

export default FinancialHealthCard;
