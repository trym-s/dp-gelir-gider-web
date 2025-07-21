// /front/src/features/credits/bank-logs/components/ExchangeRateTicker.jsx
import React from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { Button, Tooltip } from 'antd';

const tickerStyles = {
  container: {
    padding: 'var(--spacing-md)',
    backgroundColor: 'var(--background-color-white)',
    borderRadius: 'var(--border-radius-lg)',
    boxShadow: '0 4px 6px var(--shadow-color-05)',
    fontFamily: "'Inter', sans-serif",
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--spacing-md)',
    borderBottom: '1px solid var(--border-color-dark)',
    paddingBottom: 'var(--spacing-md)',
  },
  title: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: 'var(--text-color-primary)',
  },
  rateList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-md)',
  },
  rateItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currencyName: {
    fontSize: '1rem',
    fontWeight: '500',
    color: 'var(--text-color-secondary)',
  },
  rateValue: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
  },
};

// Mock data for exchange rates
const mockRates = {
  USD: 35.1234,
  EUR: 38.4567,
};

export function ExchangeRateTicker() {
  return (
    <div style={tickerStyles.container}>
      <div style={tickerStyles.header}>
        <h3 style={tickerStyles.title}>Güncel Kurlar</h3>
        <Tooltip title="Kurları Yenile">
          <Button 
            icon={<FiRefreshCw />} 
            // Mock refresh does nothing, but keeps the UI consistent
            onClick={() => console.log("Mock refresh clicked")} 
          />
        </Tooltip>
      </div>
      <div style={tickerStyles.rateList}>
        <div style={tickerStyles.rateItem}>
          <span style={tickerStyles.currencyName}>USD / TRY</span>
          <span style={tickerStyles.rateValue}>{mockRates.USD.toFixed(4)}</span>
        </div>
        <div style={tickerStyles.rateItem}>
          <span style={tickerStyles.currencyName}>EUR / TRY</span>
          <span style={tickerStyles.rateValue}>{mockRates.EUR.toFixed(4)}</span>
        </div>
      </div>
    </div>
  );
}