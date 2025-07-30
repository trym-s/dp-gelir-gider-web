import React from 'react';
import { Card, Typography, Tag } from 'antd';
import './KMHCard.css'; // KMH Kartına özel CSS dosyası

const { Text } = Typography;

// KMH durumları için renkler
const statusColors = {
  'Aktif': 'success',
  'Pasif': 'warning',
  'Bloke': 'error',
};

const KMHCard = ({ bank, onCardClick }) => {
  const { name, status, kmhLimiti, risk, hesapKesimTarihi } = bank;

  return (
    <Card
      className="data-card" // Paylaşılan stil sınıfını kullanabiliriz
      size="small"
      hoverable
      onClick={() => onCardClick(bank)}
      title={<Text className="bank-name">{name}</Text>}
      extra={<Tag color={statusColors[status] || 'default'}>{status}</Tag>}
    >
      <div className="kmh-details-list">
        <div className="info-row">
          <Text type="secondary">KMH Limiti:</Text>
          <Text strong>{(kmhLimiti || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</Text>
        </div>
        <div className="info-row">
          <Text type="secondary">Risk (Harcanan):</Text>
          <Text strong style={{ color: '#cf1322' }}>{(risk || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</Text>
        </div>
        <div className="info-row">
          <Text type="secondary">Hesap Kesim Tarihi:</Text>
          <Text strong>{hesapKesimTarihi}</Text>
        </div>
      </div>
    </Card>
  );
};

export default KMHCard;
