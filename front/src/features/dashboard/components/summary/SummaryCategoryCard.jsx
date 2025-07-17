import React from 'react';
import { Card, Col, Row, Button } from 'antd';
import CircularProgressCard from '../CircularProgressCard'; // Assuming this path is correct
import { formatCurrency } from './helpers';

const TotalDisplayCard = ({ title, amount, color }) => {
  return (
    <div className="progress-card" style={{ justifyContent: 'center', cursor: 'default', alignItems: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <h3 className="progress-card-title">{title}</h3>
      <p className="progress-card-amount" style={{ color: `var(--${color})`, fontSize: '1.5rem', margin: 0 }}>{formatCurrency(amount)}</p>
    </div>
  );
};

const SummaryCategoryCard = ({ title, summary, onCardClick, type, onChartClick }) => {
  const isExpense = type === 'expense';

  const {
    total = 0,
    paid = 0,
    remaining = 0,
  } = summary;

  const paidPercentage = total > 0 ? (paid / total) * 100 : 0;
  const remainingPercentage = total > 0 ? (remaining / total) * 100 : 0;

  return (
    <Col xs={24} lg={12}>
      <Card 
        title={title} 
        variant="borderless" 
        className="summary-category-card"
        extra={typeof onChartClick === 'function' && <Button onClick={() => onChartClick(type)}>Grafik Görüntüle</Button>}
      >
        <div className="summary-card-container">
          <CircularProgressCard
            title={isExpense ? "Ödenen" : "Alınan"}
            percentage={paidPercentage}
            text={`${Math.round(paidPercentage)}%`}
            amount={paid}
            color="success-color"
            onClick={() => onCardClick(isExpense ? 'paid' : 'received', isExpense ? 'Yapılan Ödemeler' : 'Alınan Gelirler')}
          />
          <CircularProgressCard
            title={isExpense ? "Ödenecek Kalan" : "Alınacak Kalan"}
            percentage={remainingPercentage}
            text={`${Math.round(remainingPercentage)}%`}
            amount={remaining}
            color={isExpense ? "error-color" : "warning-color"}
            onClick={() => onCardClick(isExpense ? 'expense_remaining' : 'income_remaining', isExpense ? 'Ödenecek Giderler' : 'Alınacak Gelirler')}
          />
          <TotalDisplayCard
            title={isExpense ? "Toplam Gider" : "Toplam Gelir"}
            amount={total}
            color={isExpense ? "text-color-primary" : "success-color"}
          />
        </div>
      </Card>
    </Col>
  );
};

export default SummaryCategoryCard;
