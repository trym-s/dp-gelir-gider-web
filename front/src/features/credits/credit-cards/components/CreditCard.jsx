import React from 'react';
import { Button } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import CreditCardHeader from './CreditCardHeader';
import LimitProgressBar from './LimitProgressBar';
import BalanceDetails from './BalanceDetails';
import DateInfo from './DateInfo';
import { formatCurrency } from '../utils/cardUtils';
import '../styles/CreditCard.css';

const CreditCard = ({ card, onClick, onEditClick, isInteractive = true }) => {
  const limit = parseFloat(card.limit) || 0;
  const currentDebt = parseFloat(card.current_debt) || 0;
  const availableLimit = parseFloat(card.available_limit) || 0;
  const usagePercentage = limit > 0 ? (currentDebt / limit) * 100 : 0;
  const cardClassName = isInteractive ? 'card' : 'card card-static';
  const bankName = card.bank_account?.bank?.name || 'Banka Bilgisi Yok';
  const cardName = card.name || 'Kart Bilgisi Yok';

  const handleEditClick = (e) => {
    e.stopPropagation();
    onEditClick(card);
  };

  return (
    <div className={cardClassName} onClick={isInteractive ? onClick : null}>
      <CreditCardHeader bankName={bankName} brand={card.card_brand} />
      <p className="card-name">{cardName}</p>
      <div className="limit-info">
        <span>Toplam Limit:</span>
        <span className="limit-amount">{formatCurrency(limit)}</span>
      </div>
      <LimitProgressBar usagePercentage={usagePercentage} />
      <BalanceDetails availableBalance={availableLimit} risk={currentDebt} />
      <DateInfo statementDay={card.statement_day} paymentDueDay={card.due_day} />
      {isInteractive && (
        <Button
          type="text"
          icon={<EditOutlined />}
          className="edit-button"
          onClick={handleEditClick}
        />
      )}
    </div>
  );
};

export default CreditCard;
