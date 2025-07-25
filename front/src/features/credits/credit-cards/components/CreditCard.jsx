import React, { useState } from 'react';
import { Button } from 'antd';
import { EditOutlined, UploadOutlined } from '@ant-design/icons';
// --- DÜZELTİLMİŞ İMPORT YOLLARI ---
import CreditCardHeader from './CreditCardHeader';
import LimitProgressBar from './LimitProgressBar';
import BalanceDetails from './BalanceDetails';
import DateInfo from './DateInfo';
import TransactionImportWizard from './TransactionImportWizard';
// --- DÜZELTME SONU ---
import { formatCurrency } from '../utils/cardUtils';
import '../styles/CreditCard.css';

const CreditCard = ({ card, onClick, onEditClick, onCardsUpdate, isInteractive = true }) => {
  const [importWizardVisible, setImportWizardVisible] = useState(false);

  const limit = parseFloat(card.limit) || 0;
  const currentDebt = parseFloat(card.current_debt) || 0;
  const availableLimit = limit - currentDebt;
  const usagePercentage = limit > 0 ? (currentDebt / limit) * 100 : 0;
  const cardClassName = isInteractive ? 'card' : 'card card-static';
  const bankName = card.bank_account?.bank?.name || 'Banka Bilgisi Yok';
  const cardName = card.name || 'Kart Bilgisi Yok';

  const handleEditClick = (e) => {
    e.stopPropagation();
    onEditClick(card);
  };

  const handleImportClick = (e) => {
    e.stopPropagation();
    setImportWizardVisible(true);
  };

  const handleCloseImportWizard = () => {
    setImportWizardVisible(false);
  };
  
  const handleImportSuccess = () => {
    handleCloseImportWizard();
    if (onCardsUpdate) {
      onCardsUpdate();
    }
  };

  return (
    <div className={cardClassName} onClick={isInteractive && !importWizardVisible ? () => onClick(card) : null}>
      
      <CreditCardHeader bankName={bankName} brand={card.card_brand} />
      <p className="card-name">{cardName}</p>
      
      <div className="limit-info">
        <span>Toplam Limit:</span>
        <span className="limit-amount">{formatCurrency(limit)}</span>
      </div>

      <LimitProgressBar usagePercentage={usagePercentage} />
      <BalanceDetails availableBalance={availableLimit} risk={currentDebt} />
      <DateInfo statementDay={card.statement_day} paymentDueDay={card.due_day} />
      <Button
        type="text"
        icon={<UploadOutlined />}
        onClick={handleImportClick}
        className="import-button"
      />

      {isInteractive && (
        <Button
          type="text"
          icon={<EditOutlined />}
          className="edit-button"
          onClick={handleEditClick}
        />
      )}

      <TransactionImportWizard
        visible={importWizardVisible}
        onClose={handleCloseImportWizard}
        card={card}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
};

export default CreditCard;