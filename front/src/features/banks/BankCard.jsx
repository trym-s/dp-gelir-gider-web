// BankCard.jsx

import React from 'react';
import { Card, Typography, Tooltip, message } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import './BankCard.css';

const { Text } = Typography;

// --- RENK DEĞİŞİKLİĞİ: Bloke rengi gri olarak güncellendi ---
const statusColors = {
  'Aktif': { background: '#f6ffed', color: '#389e0d' },
  'Pasif': { background: '#fff1f0', color: '#f5222d' },
  'Bloke': { background: '#d4d4d4ff', color: '#6c757d' }, // Gri tonları
};

const BankCard = ({ bank, onCardClick }) => {
  const { name, accounts } = bank;

  const handleCopy = (e, iban) => {
    e.stopPropagation();
    navigator.clipboard.writeText(iban);
    message.success('IBAN kopyalandı!');
  };

  return (
    <Card 
      className="bank-card-item"
      size="small" 
      hoverable 
      title={name}
      onClick={onCardClick} 
    >
      <div className="accounts-list">
        {(accounts && accounts.length > 0) ? (
          accounts.map(account => {
            const accountStatusStyle = statusColors[account.status] || {};
            
            return (
              <div 
                key={account.id} 
                className="account-item"
                style={{ backgroundColor: accountStatusStyle.background }}
                // --- YENİ İŞLEVSELLİK: Hesap satırına tıklanınca da modal açılır ---
                onClick={onCardClick} 
              >
                <Text className="account-item-name" style={{ color: accountStatusStyle.color }}>{account.name}</Text>
                <Text className="account-item-iban">{account.iban_number}</Text>
                <Tooltip title="IBAN'ı Kopyala">
                  <CopyOutlined 
                    className="copy-icon"
                    onClick={(e) => handleCopy(e, account.iban_number)} 
                  />
                </Tooltip>
              </div>
            );
          })
        ) : (
          <Text type="secondary" onClick={(e) => e.stopPropagation()}>Bu bankaya ait hesap bulunmuyor.</Text>
        )}
      </div>
    </Card>
  );
};

export default BankCard;