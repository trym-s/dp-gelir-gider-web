// front/src/features/credits/credit-cards/components/CreditCard.jsx

import React, { useState } from 'react';
import { Button } from 'antd';
import { EditOutlined, UploadOutlined } from '@ant-design/icons';
// CreditCardHeader, LimitProgressBar, BalanceDetails, DateInfo are internal components
// import CreditCardHeader from './CreditCardHeader'; // Bu bileşen yerine doğrudan rendering yapılacak
import LimitProgressBar from './LimitProgressBar';
import BalanceDetails from './BalanceDetails';
import DateInfo from './DateInfo'; // DateInfo bileşeni kullanılacak
import TransactionImportWizard from './TransactionImportWizard';
import { formatCurrency } from '../utils/cardUtils'; // Para birimi formatlama yardımcı fonksiyonu
import '../styles/CreditCard.css';
import dayjs from 'dayjs'; // Tarih işlemleri için dayjs kütüphanesi

import { bankLogoMap } from '../../../../icons/bankLogoMap';

const CreditCard = ({ card, onClick, onEditClick, onCardsUpdate, isInteractive = true }) => {
  if (!card) {
    console.warn("CreditCard Bileşeni: 'card' prop'u geçersiz veya eksik.");
    return null; // Or return a placeholder/skeleton if desired
  }
  console.log("CreditCard Bileşeni: Alınan 'card' prop'u:", card); // Alınan card prop'unu logla
  const [importWizardVisible, setImportWizardVisible] = useState(false);

  // Kart objesinin doğrudan alanlarına erişiliyor
  const limit = parseFloat(card.limit) || 0; // 'limit' alanı kullanılıyor
  const currentDebt = parseFloat(card.current_debt) || 0;
  const availableLimit = parseFloat(card.available_limit) || 0;
  const usagePercentage = limit > 0 ? (currentDebt / limit) * 100 : 0;
  const cardClassName = isInteractive ? 'card' : 'card card-static';

  // Banka adını alma: Önce iç içe geçmiş yolu dene, sonra üst seviye 'bank_name'i, en son varsayılan
  const bankName = card.bank_account?.bank?.name || card.bank_name || 'Bilinmiyor'; 
  const cardName = card.name || 'Kart Bilgisi Yok';

  const logoUrl = bankLogoMap[bankName] || bankLogoMap['default'];

  // Kart numarasını görüntülemek için yardımcı fonksiyon
  const displayCardNumber = (number) => {
    if (!number) return '**** **** **** ****';
    // Eğer backend'den zaten maskeli geliyorsa (yıldız içeriyorsa), direkt kullan
    if (typeof number === 'string' && number.includes('****')) {
        return number;
    }
    // Aksi takdirde, tam numarayı maskele (backend'den tam numara geliyorsa)
    if (typeof number === 'string' && number.length >= 16) {
        return `${number.slice(0, 4)} **** **** ${number.slice(-4)}`;
    }
    return '**** **** **** ****'; // Varsayılan veya geçersiz durum
  };

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
      
      {/* CreditCardHeader bileşeni yerine doğrudan logo ve banka adı rendering'i */}
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src={logoUrl} alt={`${bankName} Logo`} style={{ height: '24px', width: 'auto' }} />
            <span className="bank-name">{bankName}</span> {/* Banka adı metin olarak */}
        </div>
      </div>

      <p className="card-name">{cardName}</p>
      
      {/* Kart numarasını göster */}
      <div style={{ fontSize: '0.95rem', color: '#4a5568', marginBottom: '8px' }}>
          Kart No: <span style={{ fontWeight: '600' }}>{displayCardNumber(card.credit_card_no)}</span>
      </div>

      <div className="limit-info">
        <span>Toplam Limit:</span>
        <span className="limit-amount">{formatCurrency(limit)}</span>
      </div>

      <LimitProgressBar usagePercentage={usagePercentage} />
      <BalanceDetails availableBalance={availableLimit} risk={currentDebt} />
      
      {/* DateInfo bileşenine güncel prop'lar ve son kullanma tarihi gönderiliyor */}
      <DateInfo 
        statementDay={card.statement_day} 
        paymentDueDay={card.due_day} 
        expirationDate={card.expiration_date ? dayjs(card.expiration_date, 'MM/YY').format('MM/YY') : 'Geçersiz Tarih'}
      />

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
