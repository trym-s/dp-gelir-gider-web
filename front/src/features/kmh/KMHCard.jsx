import React, { useState } from 'react';
import { Card, Typography, Tag, Button, InputNumber, Input, Space } from 'antd';
import { EditOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import './KMHCard.css'; // Özel CSS dosyanız

import { updateKmhAccount } from '../../api/KMHStatusService';

const { Text } = Typography;

// KMH durumları için renkler
const statusColors = {
  'Aktif': 'success',
  'Pasif': 'warning',
  'Bloke': 'error',
};

const KMHCard = ({ bank, onCardClick, onSave }) => {
  // Gelen 'bank' prop'u içindeki eski ve yeni alan adlarını yönetmek için uyarlamalar yapıldı.
  const { name, status, kmh_limit, risk, statement_date_str, id } = bank;
  const kmhLimiti = bank.kmhLimiti ?? kmh_limit;
  const hesapKesimTarihi = bank.hesapKesimTarihi ?? statement_date_str;

  // Düzenleme modu ve düzenlenen değerler için state yönetimi
  const [isEditing, setIsEditing] = useState(false);
  const [editedLimit, setEditedLimit] = useState(kmhLimiti);
  const [editedDate, setEditedDate] = useState(hesapKesimTarihi);

  // Düzenleme modunu başlatan fonksiyon
  const handleEdit = (e) => {
    e.stopPropagation(); // Butona tıklamanın kartın geneline tıklamayı tetiklemesini engeller
    setIsEditing(true);
  };

  // Değişiklikleri iptal eden fonksiyon
  const handleCancel = (e) => {
    e.stopPropagation();
    // Değerleri orijinal haline getir ve düzenleme modundan çık
    setEditedLimit(kmhLimiti);
    setEditedDate(hesapKesimTarihi);
    setIsEditing(false);
  };

  // Değişiklikleri kaydeden fonksiyon
  const handleSave = (e) => {
    e.stopPropagation();
    onSave({ ...bank, id, kmhLimiti: editedLimit, hesapKesimTarihi: editedDate });
    setIsEditing(false);
  };

  // Kart başlığını dinamik olarak oluşturan bölüm
  const cardTitle = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Space>
        <Text className="bank-name">{name}</Text>
        {/* Düzenleme modunda değilken düzenle butonu gösterilir */}
        {!isEditing && <Button type="text" icon={<EditOutlined />} onClick={handleEdit} />}
      </Space>
      
      {/* Düzenleme moduna göre butonları veya durumu göster */}
      {isEditing ? (
        <Space>
          <Button icon={<SaveOutlined />} onClick={handleSave} type="primary" size="small">Kaydet</Button>
          <Button icon={<CloseOutlined />} onClick={handleCancel} size="small">İptal</Button>
        </Space>
      ) : (
        <Tag color={statusColors[status] || 'default'}>{status}</Tag>
      )}
    </div>
  );

  return (
    <Card
      className="data-card"
      size="small"
      hoverable
      onClick={() => !isEditing && onCardClick(bank)} // Düzenleme modundayken kart tıklamasını devre dışı bırak
      title={cardTitle}
      extra={null} // 'extra' prop'u yerine başlık içinde yönettik
    >
      <div className="kmh-details-list">
        <div className="info-row">
          <Text type="secondary">KMH Limiti:</Text>
          {isEditing ? (
            <InputNumber
              value={editedLimit}
              formatter={(value) => `₺ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              parser={(value) => value.replace(/₺\s?|(\.*)/g, '')}
              onChange={setEditedLimit}
              style={{ width: '100%' }}
            />
          ) : (
            <Text strong>{(kmhLimiti || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</Text>
          )}
        </div>
        <div className="info-row">
          <Text type="secondary">Risk (Harcanan):</Text>
          <Text strong style={{ color: '#cf1322' }}>{(risk || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</Text>
        </div>
        <div className="info-row">
          <Text type="secondary">Hesap Kesim Tarihi:</Text>
          {isEditing ? (
            <Input
              value={editedDate}
              onChange={(e) => setEditedDate(e.target.value)}
            />
          ) : (
            <Text strong>{hesapKesimTarihi}</Text>
          )}
        </div>
      </div>
    </Card>
  );
};

export default KMHCard;
