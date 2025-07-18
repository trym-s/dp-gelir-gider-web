import React from 'react';
import './styles/DateInfo.css';

const DateInfo = ({ statementDay, paymentDueDay }) => (
  <div className="date-container">
    <div className="date-item">
      <span className="date-label">Hesap Kesim</span>
      <span className="date-value">Ayın {statementDay}. Günü</span>
    </div>
    <div className="date-item">
      <span className="date-label">Son Ödeme</span>
      <span className="date-value">Ayın {paymentDueDay}. Günü</span>
    </div>
  </div>
);

export default DateInfo;
