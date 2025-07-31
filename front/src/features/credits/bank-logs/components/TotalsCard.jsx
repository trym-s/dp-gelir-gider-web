// /front/src/features/credits/bank-logs/components/TotalsCard.jsx
import React from 'react';
import { Tooltip } from 'antd';

const cardStyles = {
  container: {
    backgroundColor: 'var(--primary-color-20)',
    borderRadius: 'var(--border-radius-lg)',
    boxShadow: '0 2px 4px var(--shadow-color-05)',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.5fr) 180px 1fr 1fr 1fr 1fr 1fr',
    alignItems: 'center',
    gap: 'var(--spacing-md)',
    marginBottom: '16px',
    border: '2px solid var(--primary-color-40)',
  },
  title: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--text-color-primary)',
  },
  totalHighlight: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    backgroundColor: 'var(--primary-color-dark)',
    borderRadius: 'var(--border-radius-base)',
    justifySelf: 'center',
  },
  totalHighlightLabel: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--background-color-white)',
    whiteSpace: 'nowrap',
  },
  totalHighlightValue: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: 'var(--background-color-white)',
    whiteSpace: 'nowrap',
  },
  totalItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 'var(--spacing-sm)',
  },
  totalLabel: {
    fontSize: '0.85rem',
    fontWeight: '500',
    color: 'var(--text-color-light)',
  },
  totalValue: {
    fontSize: '1rem',
    fontWeight: 'bold',
  },
  currencySymbol: {
    fontSize: '0.9rem',
    fontWeight: '500',
    color: 'var(--text-color-secondary)',
  },
};

const getCurrencySymbol = (label) => {
  if (label.includes('TRY')) return '₺';
  if (label.includes('USD')) return '$';
  if (label.includes('EUR')) return '€';
  if (label.includes('AED')) return 'AED';
  if (label.includes('GBP')) return '£';
  return '';
};

export function TotalsCard({ totals, rates }) {
    const grandTotal = (totals.total_try || 0) + 
                       (totals.total_usd || 0) * (rates.usd || 0) + 
                       (totals.total_eur || 0) * (rates.eur || 0) +
                       (totals.total_aed || 0) * (rates.aed || 0) +
                       (totals.total_gbp || 0) * (rates.gbp || 0);

  return (
    <div style={cardStyles.container}>
      <div style={cardStyles.title}>Toplam Bakiye</div>
      
      <Tooltip title={`Güncel kurlarla hesaplanıyor: USD: ${rates.usd} | EUR: ${rates.eur} | AED: ${rates.aed || 'N/A'} | GBP: ${rates.gbp || 'N/A'}`}>
        <div style={cardStyles.totalHighlight}>
          <span style={cardStyles.totalHighlightLabel}>Genel Toplam:</span>
          <span style={cardStyles.totalHighlightValue}>
            {grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </Tooltip>

      <div style={cardStyles.totalItem}>
        <span style={cardStyles.totalLabel}>TRY:</span>
        <span style={cardStyles.totalValue}>
          {(totals.total_try || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span style={cardStyles.currencySymbol}>{getCurrencySymbol('TRY')}</span>
      </div>
      <div style={cardStyles.totalItem}>
        <span style={cardStyles.totalLabel}>USD:</span>
        <span style={cardStyles.totalValue}>
          {(totals.total_usd || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span style={cardStyles.currencySymbol}>{getCurrencySymbol('USD')}</span>
      </div>
      <div style={cardStyles.totalItem}>
        <span style={cardStyles.totalLabel}>EUR:</span>
        <span style={cardStyles.totalValue}>
          {(totals.total_eur || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span style={cardStyles.currencySymbol}>{getCurrencySymbol('EUR')}</span>
      </div>
      <div style={cardStyles.totalItem}>
        <span style={cardStyles.totalLabel}>AED:</span>
        <span style={cardStyles.totalValue}>
          {(totals.total_aed || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span style={cardStyles.currencySymbol}>{getCurrencySymbol('AED')}</span>
      </div>
      <div style={cardStyles.totalItem}>
        <span style={cardStyles.totalLabel}>GBP:</span>
        <span style={cardStyles.totalValue}>
          {(totals.total_gbp || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span style={cardStyles.currencySymbol}>{getCurrencySymbol('GBP')}</span>
      </div>
    </div>
  );
}