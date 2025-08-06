// /front/src/features/credits/bank-logs/components/ExchangeRateTicker.jsx
import React, { useEffect } from 'react'; // useState import'unu kaldırın
import { EditableTotal } from './EditableTotal';
import exchangeService from '../../../../api/exchangeService';
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

// Bileşen artık state'i prop olarak alacak (rates, onRateChange)
export function ExchangeRateTicker({ rates, onRateChange }) {
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await exchangeService.getExchangeRates();
        const rawData = response.data;

        // --- DÜZELTME: API'den gelen büyük harfli key'leri küçük harfe çeviriyoruz ---
        const formattedRates = Object.keys(rawData).reduce((acc, key) => {
          acc[key.toLowerCase()] = rawData[key];
          return acc;
        }, {});
        
        // --- DÜZELTME: Kendi state'imizi değil, parent component'in state'ini güncelliyoruz ---
        onRateChange(formattedRates);

      } catch (error) {
        console.error('Error fetching exchange rates:', error);
        // Hata durumunda da parent component'i bilgilendir
        onRateChange({
          usd: 'Hata',
          eur: 'Hata',
          aed: 'Hata',
          gbp: 'Hata',
        });
      }
    };

    fetchRates();
  }, [onRateChange]); // Dependency array'e onRateChange eklenmesi önerilir.

  const handleRateChange = (currency, event) => {
    const value = event.target.value.replace(/[^0-9.]/g, '');
    // Değişiklik olduğunda parent'taki state'i güncelle
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
          onChange={(e) => handleRateChange('usd', e)} // onChange handler'ını ekleyin
          isEditing={true}
          isHot={true}
          labelStyle={{ fontWeight: '500', color: 'var(--text-color-secondary)'}}
        />
        <EditableTotal
          label="EUR/TRY"
          value={rates.eur}
          onChange={(e) => handleRateChange('eur', e)} // onChange handler'ını ekleyin
          isEditing={true}
          isHot={true}
          labelStyle={{ fontWeight: '500', color: 'var(--text-color-secondary)'}}
        />
        <EditableTotal
          label="AED/TRY"
          value={rates.aed}
          onChange={(e) => handleRateChange('aed', e)} // onChange handler'ını ekleyin
          isEditing={true}
          isHot={true}
          labelStyle={{ fontWeight: '500', color: 'var(--text-color-secondary)'}}
        />
        <EditableTotal
          label="GBP/TRY"
          value={rates.gbp}
          onChange={(e) => handleRateChange('gbp', e)} // onChange handler'ını ekleyin
          isEditing={true}
          isHot={true}
          labelStyle={{ fontWeight: '500', color: 'var(--text-color-secondary)'}}
        />
      </div>
    </div>
  );
}
