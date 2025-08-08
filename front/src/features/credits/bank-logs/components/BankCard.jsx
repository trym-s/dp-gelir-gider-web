// /front/src/features/credits/bank-logs/components/BankCard.jsx
import React, { useMemo } from 'react'; // useMemo import edildi
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
    gridTemplateColumns: 'minmax(0, 1.5fr) 180px 1fr 1fr 1fr 1fr 1fr',
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
export function BankCard({ bankData, editMode, onBalanceChange, currentRates, bankLogoMap }) {

  // --- GÜNCELLEME: Toplam bakiye artık öncelikli olarak kayıtlı kurlarla hesaplanıyor. ---
  const totalInTry = useMemo(() => {
    const log = bankData.log;
    if (!log) return 0;

    // Kayıtlı kur varsa onu, yoksa güncel kuru (currentRates) kullan
    const usdRate = log.rate_usd_try || currentRates.usd || 0;
    const eurRate = log.rate_eur_try || currentRates.eur || 0;
    const aedRate = log.rate_aed_try || currentRates.aed || 0;
    const gbpRate = log.rate_gbp_try || currentRates.gbp || 0;

    const total =
      (parseFloat(log.amount_try) || 0) +
      (parseFloat(log.amount_usd) || 0) * parseFloat(usdRate) +
      (parseFloat(log.amount_eur) || 0) * parseFloat(eurRate) +
      (parseFloat(log.amount_aed) || 0) * parseFloat(aedRate) +
      (parseFloat(log.amount_gbp) || 0) * parseFloat(gbpRate);

    return total;
  }, [bankData.log, currentRates]); // Bağımlılıkları ekledik

  // Tooltip içeriğini dinamik olarak oluşturan fonksiyon
  const getTooltipContent = () => {
    const logRates = bankData.log;
    const hasSavedRates = logRates?.rate_usd_try;

    const titlePrefix = hasSavedRates ? "Kaydedilen Kur: " : "Güncel Kur ile Hesaplama: ";
    const usdRate = hasSavedRates ? parseFloat(logRates.rate_usd_try).toFixed(4) : (currentRates.usd || 'N/A');
    const eurRate = hasSavedRates ? parseFloat(logRates.rate_eur_try).toFixed(4) : (currentRates.eur || 'N/A');
    const aedRate = hasSavedRates ? parseFloat(logRates.rate_aed_try).toFixed(4) : (currentRates.aed || 'N/A');
    const gbpRate = hasSavedRates ? parseFloat(logRates.rate_gbp_try).toFixed(4) : (currentRates.gbp || 'N/A');

    return `${titlePrefix} USD: ${usdRate} | EUR: ${eurRate} | AED: ${aedRate} | GBP: ${gbpRate}`;
  };

  const containerStyle = editMode
    ? { ...cardStyles.container, ...cardStyles.containerEditing }
    : cardStyles.container;

  return (
    <div style={containerStyle}>
      <div style={cardStyles.bankInfo}>
        {bankData.name && <img src={bankLogoMap[bankData.name] || bankLogoMap['default']} alt={`${bankData.name} logo`} style={cardStyles.logo} />}
        <span style={cardStyles.bankName}>{bankData.name}</span>
      </div>

      <Tooltip title={getTooltipContent()}>
        <div style={cardStyles.totalHighlight}>
          <span style={cardStyles.totalHighlightLabel}>Toplam:</span>
          <span style={cardStyles.totalHighlightValue}>
              {totalInTry.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </Tooltip>

      <EditableTotal
        label="TRY"
        value={bankData.log?.amount_try}
        onChange={(e) => onBalanceChange(bankData.id, 'amount_try', e.target.value)}
        isEditing={editMode}
      />
      <EditableTotal
        label="USD"
        value={bankData.log?.amount_usd}
        onChange={(e) => onBalanceChange(bankData.id, 'amount_usd', e.target.value)}
        isEditing={editMode}
      />
      <EditableTotal
        label="EUR"
        value={bankData.log?.amount_eur}
        onChange={(e) => onBalanceChange(bankData.id, 'amount_eur', e.target.value)}
        isEditing={editMode}
      />
      <EditableTotal
        label="AED"
        value={bankData.log?.amount_aed}
        onChange={(e) => onBalanceChange(bankData.id, 'amount_aed', e.target.value)}
        isEditing={editMode}
      />
      <EditableTotal
        label="GBP"
        value={bankData.log?.amount_gbp}
        onChange={(e) => onBalanceChange(bankData.id, 'amount_gbp', e.target.value)}
        isEditing={editMode}
      />
    </div>
  );
}
