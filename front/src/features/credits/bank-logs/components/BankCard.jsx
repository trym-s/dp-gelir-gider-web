// /front/src/features/credits/bank-logs/components/BankCard.jsx
import React from 'react';
import { Tooltip } from 'antd';
import { EditableTotal } from './EditableTotal';
import './BankCard.css';

// --- Stil Nesneleri ---
const cardStyles = {
  container: {
    backgroundColor: 'var(--background-color-white)',
    borderRadius: 'var(--border-radius-lg)',
    boxShadow: '0 2px 4px var(--shadow-color-05)',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.5fr) 180px 1fr 1fr 1fr', // Removed auto for actions
    alignItems: 'center',
    gap: 'var(--spacing-md)',
    transition: 'all 0.2s ease-in-out',
    position: 'relative',
    overflow: 'hidden',
    border: '2px solid transparent',
  },
  containerEditing: {
    borderColor: 'var(--primary-color-40)',
    boxShadow: '0 4px 8px var(--shadow-color-15)',
  },
  statusBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '5px',
    backgroundColor: 'var(--success-color)',
    transition: 'opacity 0.3s ease-in-out',
  },
  bankInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    minWidth: 0,
  },
  logo: {
    width: 'auto',
    height: '20px',
    objectFit: 'contain',
    flexShrink: 0,
  },
  bankName: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--text-color-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  totalHighlight: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    backgroundColor: 'var(--primary-color-20)',
    borderRadius: 'var(--border-radius-base)',
    justifySelf: 'center',
  },
  totalHighlightLabel: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--primary-color-dark)',
  },
  totalHighlightValue: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: 'var(--primary-color)',
  },
};

// --- Bileşen ---
export function BankCard({ balanceData, editMode, onBalanceChange, currentRates }) {
  const handleValueChange = (currency, value) => {
    // Propagate changes up to the parent component
    onBalanceChange(balanceData.id, currency, value);
  };

  // Use the persisted rate from the record if it exists, otherwise use the current screen rate.
  const usdRate = balanceData.rate_usd_try || currentRates.usd;
  const eurRate = balanceData.rate_eur_try || currentRates.eur;
  
  const totalInTry = 
    (parseFloat(balanceData.amount_try) || 0) + 
    (parseFloat(balanceData.amount_usd) || 0) * parseFloat(usdRate) + 
    (parseFloat(balanceData.amount_eur) || 0) * parseFloat(eurRate);

  const isPersisted = !balanceData.id.toString().startsWith('new-');
  
  // Check if all amount fields are zero or empty
  const hasOnlyZeroAmounts = 
    (parseFloat(balanceData.amount_try) || 0) === 0 &&
    (parseFloat(balanceData.amount_usd) || 0) === 0 &&
    (parseFloat(balanceData.amount_eur) || 0) === 0;

  // Determine if the status bar should be visible
  const showStatusBar = isPersisted && !hasOnlyZeroAmounts && !editMode;

  const containerStyle = editMode 
    ? { ...cardStyles.container, ...cardStyles.containerEditing }
    : cardStyles.container;

  return (
    <div style={containerStyle}>
      <div style={{...cardStyles.statusBar, opacity: showStatusBar ? 1 : 0}}></div>
      
      <div style={cardStyles.bankInfo}>
        {balanceData.bank?.logo_url && <img src={balanceData.bank.logo_url} alt={`${balanceData.bank.name} logo`} style={cardStyles.logo} />}
        <span style={cardStyles.bankName}>{balanceData.bank?.name || 'Banka Adı Yok'}</span>
      </div>

      <Tooltip title={isPersisted ? `Kaydedilen Kurlar: USD: ${parseFloat(usdRate || 0).toFixed(4)} | EUR: ${parseFloat(eurRate || 0).toFixed(4)}` : 'Güncel kurlarla hesaplanıyor'}>
        <div style={cardStyles.totalHighlight}>
          <span style={cardStyles.totalHighlightLabel}>Toplam:</span>
          <span style={cardStyles.totalHighlightValue}>
              {totalInTry.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </Tooltip>

      <EditableTotal 
        label="TRY" 
        value={balanceData.amount_try} 
        onChange={(e) => handleValueChange('amount_try', e.target.value)} 
        isEditing={editMode} 
      />
      <EditableTotal 
        label="USD" 
        value={balanceData.amount_usd} 
        onChange={(e) => handleValueChange('amount_usd', e.target.value)} 
        isEditing={editMode} 
      />
      <EditableTotal 
        label="EUR" 
        value={balanceData.amount_eur} 
        onChange={(e) => handleValueChange('amount_eur', e.target.value)} 
        isEditing={editMode} 
      />
    </div>
  );
}