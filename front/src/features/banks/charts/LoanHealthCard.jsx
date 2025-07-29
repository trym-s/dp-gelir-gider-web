// src/features/banks/charts/LoanHealthCard.jsx (Hata mesajında belirtilen konuma göre)

import React from 'react';
import { Card, Typography, Statistic, Row, Col } from 'antd';
import styled from 'styled-components';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from "../../../utils/formatter";

const { Title, Text } = Typography;

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="custom-tooltip" style={{ backgroundColor: '#fff', padding: '1px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <p className="label">{`${data.name}: ${formatCurrency(data.value)}`}</p>
      </div>
    );
  }
  return null;
};

const StyledLoanHealthCard = styled(Card)`
  text-align: center;
  background-color: #f8f9fa;
  border-radius: 2px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  padding: 1px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  .ant-card-head {
    font-size: 0.9em;
    min-height: auto;
    padding-bottom: 8px;
  }
  .ant-card-body {
    padding: 12px !important;
  }
  .ant-statistic-title {
    font-size: 0.9em;
    margin-bottom: 4px;
  }
  .ant-statistic-content {
    font-size: 1.2em;
    font-weight: bold;
  }
  .ant-statistic-content-suffix {
    font-size: 0.8em;
  }
`;

const LoanHealthCard = ({ loanSummary }) => {
  const totalLoanDebt = loanSummary?.total_loan_debt || 0;
  const totalLoanAmount = loanSummary?.total_loan_amount || 0;

  console.log("LoanHealthCard - loanSummary:", loanSummary);
  console.log("LoanHealthCard - totalLoanDebt:", totalLoanDebt);
  console.log("LoanHealthCard - totalLoanAmount:", totalLoanAmount);

  const paidAmount = totalLoanAmount - totalLoanDebt;

  const data = [
    { name: 'Kalan Borç', value: totalLoanDebt },
    { name: 'Ödenen Tutar', value: paidAmount },
  ];

  console.log("LoanHealthCard - chart data:", data);

  const getLoanStatusColor = (debt, total) => {
    if (total === 0) return '#f0f2f5';
    const ratio = debt / total;
    if (ratio <= 0.2) return '#8fc674ff';
    if (ratio <= 0.5) return '#d7b46cff';
    return '#d86066ff';
  };

  const COLORS = [getLoanStatusColor(totalLoanDebt, totalLoanAmount), '#f0f2f5'];

  if (totalLoanAmount === 0 && totalLoanDebt === 0) {
    return (
      <StyledLoanHealthCard title="Kredi Özetleri">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Text type="secondary">Kredi verisi bulunmamaktadır.</Text>
        </div>
      </StyledLoanHealthCard>
    );
  } else if (totalLoanAmount === 0 && totalLoanDebt > 0) {
    return (
      <StyledLoanHealthCard title="Kredi Özetleri">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Text type="warning">Toplam kredi miktarı bilgisi eksik olduğu için grafik gösterilemiyor.</Text>
          <Statistic
            title="Toplam Kredi Borcu"
            value={totalLoanDebt}
            precision={2}
            formatter={(value) => <span style={{ fontSize: '1.1em', fontWeight: 'bold' }}>{formatCurrency(value)}</span>}
          />
        </div>
      </StyledLoanHealthCard>
    );
  }

  return (
    <StyledLoanHealthCard title="Kredi Özetleri">
      <div style={{ position: 'relative', height: 180, marginBottom: '10px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomTooltip />} />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={75}
              fill="#8884d8"
              paddingAngle={0}
              dataKey="value"
              startAngle={90}
              endAngle={450}
              cornerRadius={1}
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
            title="Toplam Kredi Borcu"
            value={totalLoanDebt}
            precision={2}
            formatter={(value) => <span style={{ fontSize: '1.1em', fontWeight: 'bold' }}>{formatCurrency(value)}</span>}
          />
        </div>
      </div>
      
      <Row gutter={[16, 16]} style={{ marginTop: '10px' }}>
        <Col span={12}>
          <Statistic
            title="Ödenen Tutar"
            value={paidAmount}
            precision={2}
            formatter={(value) => <span style={{ fontSize: '0.9em', color: '#8c8c8c' }}>{formatCurrency(value)}</span>}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="Toplam Kredi Miktarı"
            value={totalLoanAmount}
            precision={2}
            formatter={(value) => <span style={{ fontSize: '0.9em' }}>{formatCurrency(value)}</span>}
          />
        </Col>
      </Row>
    </StyledLoanHealthCard>
  );
};

export default LoanHealthCard;