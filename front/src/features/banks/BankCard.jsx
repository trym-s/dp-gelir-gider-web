import React from 'react';
import { Card, Tag, Tooltip, message } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import './BankCard.css';

const statusColors = {
  Aktif: 'green',
  Pasif: 'volcano',
  Bloke: 'gray',
};

// truncateIban fonksiyonu kaldırıldı
// const truncateIban = (iban, maxLength = 24) => { ... };

const BankCard = ({ bank, onCardClick }) => {
  const { name, status, accounts } = bank;

  // Ana IBAN'ı bankanın ilk hesabından alıyoruz (kısaltma yapılmayacak)
  const mainAccount = accounts && accounts.length > 0 ? accounts[0] : null;
  const fullIban = mainAccount ? mainAccount.iban : 'IBAN Bilgisi Yok';

  const handleCopy = (e) => {
    e.stopPropagation(); // Kart tıklamasını engeller
    if (fullIban && fullIban !== 'IBAN Bilgisi Yok') {
      navigator.clipboard.writeText(fullIban);
      message.success('IBAN kopyalandı!');
    } else {
      message.warn('Kopyalanacak bir IBAN bulunamadı.');
    }
  };

  return (
    <Card
      className="bank-card-item"
      size="small"
      hoverable
      onClick={onCardClick} // Kart tıklandığında onCardClick çağrılacak
    >
      <div className="bank-card-content">
        <h3 className="bank-name">{name}</h3>
        <div className="bank-iban-info">
          {/* Tooltip'te tam IBAN, kart üzerinde de tam IBAN */}
          <Tooltip title={fullIban !== 'IBAN Bilgisi Yok' ? `${fullIban} Kopyalamak için tıklayın` : 'IBAN Bilgisi Yok'}>
            <span onClick={handleCopy} className="copyable iban-text">
              {fullIban} <CopyOutlined style={{ fontSize: '12px' }} /> {/* Tam IBAN gösteriliyor */}
            </span>
          </Tooltip>
        </div>
        <Tag className={`bank-status-tag ${status.toLowerCase()}`} color={statusColors[status]}>
          {status}
        </Tag>
      </div>
    </Card>
  );
};

export default BankCard;