// front/src/features/credits/credit-cards/components/DateInfo.jsx

import React from 'react';
import './styles/DateInfo.css';
import dayjs from 'dayjs'; // dayjs'i import edin

const DateInfo = ({ statementDay, paymentDueDay, expirationDate }) => ( // expirationDate prop'u eklendi
  <div className="date-container">
    <div className="date-item">
      <span className="date-label">Hesap Kesim</span>
      <span className="date-value">Ayın {statementDay}. Günü</span>
    </div>
    <div className="date-item">
      <span className="date-label">Son Ödeme</span>
      <span className="date-value">Ayın {paymentDueDay}. Günü</span>
    </div>
    {expirationDate && ( // expirationDate varsa göster
      <div className="date-item">
        <span className="date-label">Son Kul. Tarihi</span>
        <span className="date-value">{expirationDate}</span> {/* Formatlanmış expirationDate'i göster */}
      </div>
    )}
  </div>
);

export default DateInfo;