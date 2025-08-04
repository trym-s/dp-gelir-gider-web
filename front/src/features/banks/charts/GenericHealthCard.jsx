// src/features/banks/charts/GenericHealthCard.jsx
import React from 'react';
import { Typography, Statistic, Row, Col } from 'antd';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import StyledChartCard from '../../../components/StyledChartCard'; // Assuming this path is correct
import { formatCurrency } from '../../../utils/formatter'; // Assuming this path is correct

const { Title, Text } = Typography;

// Generic Custom Tooltip for better reusability
const CustomTooltip = ({ active, payload, config }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const value = config.valueFormatter ? config.valueFormatter(data.value) : data.value.toFixed(2);
    const label = data.name;
    return (
      <div className="custom-tooltip" style={{ backgroundColor: '#f0f2f5', padding: '1px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <p className="label">{`${label}: ${value}`}</p>
      </div>
    );
  }
  return null;
};

const GenericHealthCard = ({ data, config }) => {
  const {
    title,
    mainStatisticLabel,
    mainStatisticValue,
    mainStatisticFormatter,
    mainStatisticColor,
    chartData,
    chartColors,
    kpis, // Array of { label, value, formatter } for additional statistics
    emptyMessage,
    warningMessage
  } = config;

  if (config.showEmptyState && mainStatisticValue === 0 && (config.totalLoanAmount === 0 || config.totalLimit === 0)) {
    return (
      <StyledChartCard>
        <div style={{ textAlign: 'center', padding: '10px' }}>
          <Text type="secondary">{emptyMessage || 'Veri bulunmamaktadır.'}</Text>
        </div>
      </StyledChartCard>
    );
  } else if (config.showWarningState && config.totalLoanAmount === 0 && mainStatisticValue > 0) {
    return (
      <StyledChartCard>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Text type="warning">{warningMessage || 'Toplam miktar bilgisi eksik olduğu için grafik gösterilemiyor.'}</Text>
          <Statistic
            title={mainStatisticLabel}
            value={mainStatisticValue}
            precision={2}
            formatter={mainStatisticFormatter}
          />
        </div>
      </StyledChartCard>
    );
  }

  return (
    <StyledChartCard bordered={true}>
      <Title level={4} style={{ marginBottom: '16px', fontSize: '1.2em' }}>{title}</Title>

      <div style={{ position: 'relative',borderRadius:'8px',border:'1px solid #f0f0f0', backgroundColor: '#fcfcfcff',height: 180,marginBottom: '20px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomTooltip config={config} />} />
            <Pie
              data={chartData}
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
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} stroke={chartColors[index % chartColors.length]} />
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
            title={mainStatisticLabel}
            value={mainStatisticValue}
            precision={2}
            suffix={config.mainStatisticSuffix}
            valueStyle={{ color: mainStatisticColor, fontSize: '1.2em', fontWeight: 'bold' }}
            formatter={mainStatisticFormatter}
          />
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginTop: '10px' }}>
        {kpis.map((kpi, index) => (
          <Col span={12} key={index}>
            <Statistic
              title={kpi.label}
              value={kpi.value}
              precision={2}
              formatter={kpi.formatter || ((value) => <span style={{ fontSize: '0.9em', color: '#8c8c8c' }}>{value}</span>)}
            />
          </Col>
        ))}
      </Row>
    </StyledChartCard>
  );
};

export default GenericHealthCard;
