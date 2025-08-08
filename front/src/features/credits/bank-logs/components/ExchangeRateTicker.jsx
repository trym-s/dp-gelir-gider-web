// /front/src/features/credits/bank-logs/components/ExchangeRateTicker.jsx
import React, { useState, useEffect } from 'react';
import { EditableTotal } from './EditableTotal';
import exchangeService from '../../../../api/exchangeService';
import './ExchangeRateTicker.css';

const tickerStyles = {
  container: {
    padding: 'var(--spacing-md)',
    backgroundColor: 'var(--background-color-light-gray)',
    borderRadius: 'var(--border-radius-lg)',
    boxShadow: 'inset 0 1px 3px var(--shadow-color-10)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
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
  // --- YENİ STİLLER ---
  footerNotes: {
    marginTop: 'auto', // Bu notları en alta iter
    paddingTop: 'var(--spacing-md)',
    fontSize: '0.75rem',
    color: 'var(--text-color-light)',
    lineHeight: '1.5',
    borderTop: '1px solid var(--border-color-light)',
  },
  note: {
    marginBottom: 'var(--spacing-xs)',
  },
  highlight: {
    fontWeight: '600',
    color: 'var(--text-color-secondary)',
  }
};

export function ExchangeRateTicker({ rates, onRateChange }) {
  // --- YENİ: Son güncelleme zamanı için state ---
  const [lastUpdated, setLastUpdated] = useState('Yükleniyor...');

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await exchangeService.getExchangeRates();
        const responseData = response.data;

        // API'den gelen veriyi formatla (büyük/küçük harf duyarlılığı için)
        const formattedRates = Object.keys(responseData.rates).reduce((acc, key) => {
          acc[key.toLowerCase()] = responseData.rates[key];
          return acc;
        }, {});
        
        // Parent component'in state'ini güncelle
        onRateChange(formattedRates);
        // Son güncelleme zamanını state'e ata
        setLastUpdated(responseData.last_updated || 'Bilinmiyor');

      } catch (error) {
        console.error('Error fetching exchange rates:', error);
        onRateChange({ usd: 'Hata', eur: 'Hata', aed: 'Hata', gbp: 'Hata' });
        setLastUpdated('Hata oluştu');
      }
    };

    fetchRates();
    // Her 15 dakikada bir kurları yeniden çekmek için interval kurabiliriz (opsiyonel)
    const intervalId = setInterval(fetchRates, 15 * 60 * 1000); 

    // Component unmount olduğunda interval'ı temizle
    return () => clearInterval(intervalId);

  }, [onRateChange]);

  const handleRateChange = (currency, event) => {
    const value = event.target.value.replace(/[^0-9.]/g, '');
    onRateChange(prevRates => ({ ...prevRates, [currency]: value }));
  };

  return (
    <div style={tickerStyles.container}>
      <div>
        <h3 style={tickerStyles.title}>Güncel Kurlar</h3>
        <div style={tickerStyles.ratesContainer}>
          <EditableTotal
            label="USD/TRY" value={rates.usd} onChange={(e) => handleRateChange('usd', e)}
            isEditing={true} isHot={true}
          />
          <EditableTotal
            label="EUR/TRY" value={rates.eur} onChange={(e) => handleRateChange('eur', e)}
            isEditing={true} isHot={true}
          />
          <EditableTotal
            label="AED/TRY" value={rates.aed} onChange={(e) => handleRateChange('aed', e)}
            isEditing={true} isHot={true}
          />
          <EditableTotal
            label="GBP/TRY" value={rates.gbp} onChange={(e) => handleRateChange('gbp', e)}
            isEditing={true} isHot={true}
          />
        </div>
      </div>

      {/* --- YENİ: Notların olduğu footer bölümü --- */}
      <div style={tickerStyles.footerNotes}>
        <p style={tickerStyles.note}>
          • Kayıtlı verilerin <span style={tickerStyles.highlight}>Toplam TRY</span> karşılığı, ilgili kaydın yapıldığı güne ait kur üzerinden hesaplanır.
        </p>
        <p style={tickerStyles.note}>
          • Güncel kurların son güncellenme zamanı: <span style={tickerStyles.highlight}>{lastUpdated}</span>
        </p>
      </div>
    </div>
  );
}
