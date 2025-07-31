// /front/src/features/credits/bank-logs/components/ExchangeRateTicker.jsx
import React from 'react';
import { EditableTotal } from './EditableTotal'; // Re-using the same component for consistency
import './ExchangeRateTicker.css';

const tickerStyles = {
  container: {
    padding: 'var(--spacing-md)',
    backgroundColor: 'var(--background-color-light-gray)',
    borderRadius: 'var(--border-radius-lg)',
    boxShadow: 'inset 0 1px 3px var(--shadow-color-10)',
  },
  title: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: 'var(--text-color-primary)',
    marginBottom: 'var(--spacing-md)',
    borderBottom: '2px solid var(--primary-color-20)',
    paddingBottom: 'var(--spacing-sm)',
  },
  ratesContainer: {
    display: 'grid',
    gap: 'var(--spacing-md)',
  },
};

export function ExchangeRateTicker({ rates, onRateChange }) {
  const handleRateChange = (currency, event) => {
    // Ensure only numeric values are passed up
    const value = event.target.value.replace(/[^0-9.]/g, '');
    onRateChange(prevRates => ({
      ...prevRates,
      [currency]: value,
    }));
  };

  return (
    <div style={tickerStyles.container}>
      <h3 style={tickerStyles.title}>Güncel Kurlar</h3>
      <div style={tickerStyles.ratesContainer}>
        <EditableTotal
          label="USD/TRY"
          value={rates.usd}
          onChange={(e) => handleRateChange('usd', e)}
          isEditing={true} // Always in edit mode
          isHot={true}
          labelStyle={{ fontWeight: '500', color: 'var(--text-color-secondary)'}}
        />
        <EditableTotal
          label="EUR/TRY"
          value={rates.eur}
          onChange={(e) => handleRateChange('eur', e)}
          isEditing={true} // Always in edit mode
          isHot={true}
          labelStyle={{ fontWeight: '500', color: 'var(--text-color-secondary)'}}
        />
        <EditableTotal
          label="AED/TRY"
          value={rates.aed}
          onChange={(e) => handleRateChange('aed', e)}
          isEditing={true}
          isHot={true}
          labelStyle={{ fontWeight: '500', color: 'var(--text-color-secondary)'}}
        />
        <EditableTotal
          label="GBP/TRY"
          value={rates.gbp}
          onChange={(e) => handleRateChange('gbp', e)}
          isEditing={true}
          isHot={true}
          labelStyle={{ fontWeight: '500', color: 'var(--text-color-secondary)'}}
        />
      </div>
    </div>
  );
}
