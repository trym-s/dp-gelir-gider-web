// front/src/features/banks/BankCard.jsx

import React from 'react';
import { Card, Tag, Tooltip, message } from 'antd'; // Tag ve message hala BankCard içinde kullanılıyor
import { CopyOutlined } from '@ant-design/icons';
import './BankCard.css';

const statusColors = { // Bu objeye artık ihtiyacımız yok, kaldırılabilir
  Aktif: 'green',
  Pasif: 'volcano',
  Bloke: 'gray',
};

// bank prop'undan 'status' kaldırıldı
const BankCard = ({ bank, onCardClick }) => {
  const { name, accounts } = bank; // 'status' buradan kaldırıldı

  // Ana IBAN'ı bankanın ilk hesabından alıyoruz
  const mainAccount = accounts && accounts.length > 0 ? accounts[0] : null;
  const fullIban = mainAccount ? mainAccount.iban : 'IBAN Bilgisi Yok';

  const handleCopy = (e) => {
    e.stopPropagation();
    if (fullIban && fullIban !== 'IBAN Bilgisi Yok') {
      navigator.clipboard.writeText(fullIban);
      message.success('IBAN kopyalandı!');
    } else {
      message.warn('Kopyalanacak bir IBAN bulunamadı.');
    }
  };

  return (
    <Card className="bank-card-item" size="small" hoverable onClick={onCardClick}>
      <div className="bank-card-content">
        <h3 className="bank-name">{name}</h3>
        <div className="bank-iban-info">
          <Tooltip title={fullIban !== 'IBAN Bilgisi Yok' ? `${fullIban} Kopyalamak için tıklayın` : 'IBAN Bilgisi Yok'}>
            <span onClick={handleCopy} className="copyable iban-text">
              {fullIban} <CopyOutlined style={{ fontSize: '12px' }} />
            </span>
          </Tooltip>
        </div>
        {/* Statü Tag'i kaldırıldı, çünkü backend'den gelmiyor */}
        {/* <Tag className={`bank-status-tag ${status.toLowerCase()}`} color={statusColors[status]}>
          {status}
        </Tag> */}
      </div>
    </Card>
  );
};

export default BankCard;