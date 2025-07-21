// /front/src/features/credits/bank-logs/components/EditableTotal.jsx
import React, { useEffect, useRef } from 'react';

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    padding: 'var(--spacing-xs)',
    borderRadius: 'var(--border-radius-base)',
    transition: 'all 0.2s ease-in-out',
    height: '38px', // Fixed height to prevent layout shifts
  },
  containerHot: {
    backgroundColor: 'var(--background-color-soft)',
    boxShadow: '0 0 0 2px var(--primary-color-20)',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '500',
    color: 'var(--text-color-light)',
    whiteSpace: 'nowrap',
  },
  valueDisplay: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 'var(--spacing-xs)',
  },
  valueText: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: 'var(--text-color-primary)',
  },
  input: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: 'var(--text-color-primary)',
    textAlign: 'right',
    width: '80px',
    outline: 'none',
    border: 'none',
    backgroundColor: 'transparent',
    '-moz-appearance': 'textfield',
    'appearance': 'textfield',
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
  return '';
};

export const EditableTotal = React.forwardRef(({ label, value, isEditing, isHot, onChange, onEnterPress }, ref) => {
  const symbol = getCurrencySymbol(label);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onEnterPress();
    }
  };

  const combinedContainerStyle = {
    ...styles.container,
    ...(isHot && isEditing ? styles.containerHot : {}),
  };

  return (
    <div style={combinedContainerStyle}>
      <span style={styles.label}>{label}:</span>
      {isEditing ? (
        <>
          <input
            ref={ref}
            type="number"
            value={value}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            style={styles.input}
          />
          <span style={styles.currencySymbol}>{symbol}</span>
        </>
      ) : (
        <div style={styles.valueDisplay}>
            <span style={styles.valueText}>
                {value.toLocaleString(label.includes('USD') ? 'en-US' : 'tr-TR')}
            </span>
            <span style={styles.currencySymbol}>{symbol}</span>
        </div>
      )}
    </div>
  );
});