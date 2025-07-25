import React from 'react';
import { Tag, Typography } from 'antd';
import { CheckCircleOutlined, StopOutlined } from '@ant-design/icons';
import './CreditCard.css'; // Yeni CSS dosyası

const { Text, Title } = Typography;

const CreditCard = ({ card }) => {
  // Kart numarasının ilk 4 ve son 4 hanesini göster
  const formatCardNumber = (number) => {
    if (!number || number.length < 16) return '**** **** **** ****';
    return `${number.slice(0, 4)} **** **** ${number.slice(-4)}`;
  };

  const statusConfig = {
    'Aktif': { color: 'success', icon: <CheckCircleOutlined /> },
    'Pasif': { color: 'error', icon: <StopOutlined /> },
    'Bloke': { color: 'default', icon: <StopOutlined /> },
  };

  const currentStatus = statusConfig[card.status] || statusConfig['Bloke'];

  return (
    <div className="credit-card-item data-card">
      <div className="data-card-header">
        <div>
          <Title level={5} className="bank-name">{card.bank_name}</Title>
          <Text type="secondary">{card.card_name}</Text>
        </div>
        <Tag color={currentStatus.color} icon={currentStatus.icon}>
          {card.status}
        </Tag>
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
        {/* YENİ: Son Kullanma Tarihi eklendi */}
        <div className="info-row">
          <Text type="secondary">Son Kul. Tarihi</Text>
          <Text strong>{card.expire_date}</Text>
        </div>
      </div>
    </div>
  );
};

export default CreditCard;
