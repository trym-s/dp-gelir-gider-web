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
    gridTemplateColumns: 'minmax(0, 1.5fr) auto 1fr 1fr 1fr',
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
    justifySelf: 'start',
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
    textAlign: 'right',
    fontSize: '1rem',
    fontWeight: 'bold',
  }
};

export function TotalsCard({ totals, rates }) {
    const grandTotal = (totals.total_try || 0) + (totals.total_usd || 0) * (rates.usd || 0) + (totals.total_eur || 0) * (rates.eur || 0);

  return (
    <div style={cardStyles.container}>
      <div style={cardStyles.title}>Toplamlar</div>
      
      <Tooltip title={`Güncel kurlarla hesaplanıyor: USD: ${rates.usd} | EUR: ${rates.eur}`}>
        <div style={cardStyles.totalHighlight}>
          <span style={cardStyles.totalHighlightLabel}>Genel Toplam:</span>
          <span style={cardStyles.totalHighlightValue}>
            {grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </Tooltip>

      <div style={cardStyles.totalItem}>
        {totals.total_try.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div style={cardStyles.totalItem}>
        {totals.total_usd.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div style={cardStyles.totalItem}>
        {totals.total_eur.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
    </div>
  );
}