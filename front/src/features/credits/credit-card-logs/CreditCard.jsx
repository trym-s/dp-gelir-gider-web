// front/src/features/credits/credit-card-logs/CreditCard.jsx

import React from 'react';
import { Tag, Typography } from 'antd';
import { CheckCircleOutlined, StopOutlined } from '@ant-design/icons';
import './CreditCard.css'; 
import dayjs from 'dayjs'; 

const { Text, Title } = Typography;

// front/src/features/banks/BanksDashboardPage.jsx dosyasından alınan banka logo haritası
const bankLogoMap = {
  'Akbank': '/bank_logo/Akbank-icon.png',
  'TEB': '/bank_logo/Teb-icon.png',
  'Yapi Kredi': '/bank_logo/Yapi-Kredi-Logo.png',
  'TFKB': '/bank_logo/tfkb-logo.png',  
  'Garanti BBVA': '/bank_logo/garanti-logo.png',
  'Is Bankasi': '/bank_logo/is-bankasi-logo.png',
  'Ziraat Bankasi': '/bank_logo/ziraat-logo.png',
  'QNB': '/bank_logo/qnb-logo.png', // `BanksDashboardPage.jsx` ile tutarlı logo adı
  'Vakifbank': '/bank_logo/vakifbank-logo.png',
  'default': '/default-bank-logo.png' 
};


const CreditCard = ({ card }) => {
  const formatCardNumber = (number) => {
    if (!number) return '**** **** **** ****';
    if (typeof number === 'string' && number.includes('****')) {
      return number; 
    }
    if (typeof number === 'string' && number.length >= 16) {
        return `${number.slice(0, 4)} **** **** ${number.slice(-4)}`;
    }
    return '**** **** **** ****';
  };

  const statusConfig = {
    'Aktif': { color: 'success', icon: <CheckCircleOutlined /> },
    'Pasif': { color: 'error', icon: <StopOutlined /> },
    'Bloke': { color: 'default', icon: <StopOutlined /> },
  };

  const currentStatus = statusConfig[card.status] || statusConfig['Bloke'];

  // Görüntülenecek banka adını belirle
  const bankName = card.bank_name || card.bank_account?.bank?.name || 'Bilinmiyor';
  // Banka adına göre logo URL'sini al, yoksa varsayılanı kullan
  const logoUrl = bankLogoMap[bankName] || bankLogoMap['default'];

  return (
    <div className="credit-card-item data-card">
      
      {/* === 2. DEĞİŞİKLİK: Durum Etiketini başlığın dışına taşıdık === */}
      {/* Bu sayede onu köşeye serbestçe konumlandırabiliriz. */}
      <div className="card-status-tag">
        <Tag color={currentStatus.color} icon={currentStatus.icon}>
          {card.status}
        </Tag>
      </div>

      <div className="data-card-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src={logoUrl} alt={`${bankName} Logo`} style={{ height: '24px', width: 'auto' }} />
            <Title level={5} className="bank-name" style={{ margin: 0 }}>{bankName}</Title>
          </div>
          <Text type="secondary">{card.name}</Text>
        </div>
        {/* Etiketi buradan kaldırdık */}
      </div>
      <div className="data-card-body">
        <div className="card-number-section">
          <Text className="card-number-label">Kart Numarası</Text>
          <Text className="card-number">{formatCardNumber(card.card_number)}</Text>
        </div>
        <div className="info-row">
          <Text type="secondary">Limit</Text>
          <Text strong>{parseFloat(card.limit).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</Text>
        </div>
        <div className="info-row">
          <Text type="secondary">Son Kul. Tarihi</Text>
          <Text strong>{card.expire_date ? dayjs(card.expire_date, 'MM/YY').format('MM/YY') : 'Geçersiz Tarih'}</Text>
        </div>
      </div>
    </div>
  );
};


export default CreditCard;