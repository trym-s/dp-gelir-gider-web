import React from 'react';
import { formatCurrency } from '../utils/cardUtils';
import './styles/BalanceDetails.css';

const BalanceDetails = ({ availableBalance, risk }) => (
  <div className="balance-container">
    <div className="balance-item">
      <span className="balance-label">Kullanılabilir Limit</span>
      <span className="balance-value available">{formatCurrency(availableBalance)}</span>
    </div>
    <div className="balance-item">
      <span className="balance-label">Toplam Risk</span>
      <span className="balance-value risk">{formatCurrency(risk)}</span>
    </div>
  </div>
);

export default BalanceDetails;
