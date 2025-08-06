import React, { useState } from 'react';
import { Card, Typography, Tag, Button, InputNumber, Input, Space, Select } from 'antd';
import { EditOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import './KMHCard.css'; // Özel CSS dosyanız

import { updateKmhAccount } from '../../api/KMHStatusService';

const { Option } = Select;
const { Text } = Typography;

const bankLogoMap = {
  'Akbank': '/bank_logo/Akbank-icon.png',
  'TEB': '/bank_logo/Teb-icon.png',
  'Yapi Kredi': '/bank_logo/Yapi-Kredi-Logo.png',
  'TFKB': '/bank_logo/tfkb-logo.png',  
  'Garanti BBVA': '/bank_logo/garanti-logo.png',
  'Is Bankasi': '/bank_logo/is-bankasi-logo.png',
  'Ziraat Bankasi': '/bank_logo/ziraat-logo.png',
  'QNB': '/bank_logo/qnb-logo.png',
  'Vakifbank': '/bank_logo/vakifbank-logo.png',
    'wio Bank': '/bank-logo/wio-logo.png',
  'default': '/default-bank-logo.png'

};

// KMH durumları için renkler
const statusColors = {
  'Aktif': 'success',
  'Pasif': 'warning',
  'Bloke': 'error',
};

const KMHCard = ({ bank, onCardClick, onSave }) => {
  // Gelen 'bank' prop'u içindeki eski ve yeni alan adlarını yönetmek için uyarlamalar yapıldı.
  const { name, status, kmh_limit, risk, statement_date_str, id } = bank;
  const bank_name = bank.bank_name;
  const kmhLimiti = bank.kmhLimiti ?? kmh_limit;
  const hesapKesimTarihi = bank.hesapKesimTarihi ?? statement_date_str;

  // Düzenleme modu ve düzenlenen değerler için state yönetimi
  const [isEditing, setIsEditing] = useState(false);
  const [editedLimit, setEditedLimit] = useState(kmhLimiti);
  const [editedDate, setEditedDate] = useState(hesapKesimTarihi);
  const [editedStatus, setEditedStatus] = useState(status);

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
    setEditedStatus(status);
    setIsEditing(false);
  };

  // Değişiklikleri kaydeden fonksiyon
  const handleSave = (e) => {
    e.stopPropagation();
    if (onSave) {
      // Değişiklikleri ve kimlik bilgilerini ana bileşene geri gönder
      onSave({
        ...bank, // subject_id gibi diğer tüm önemli alanları koru
        kmhLimiti: editedLimit,
        hesapKesimTarihi: editedDate,
        status: editedStatus,
      });
    }
    setIsEditing(false);
  };

  // Kart başlığını dinamik olarak oluşturan bölüm
  const cardTitle = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Space>
        <img src={bankLogoMap[bank.bank.name] || bankLogoMap['default']} alt={`${bank.bank.name} logo`} style={{ width: '24px', height: '24px', marginRight: '8px' }} />
        <Text className="bank-name">{name}</Text>
        {/* Düzenleme modunda değilken düzenle butonu gösterilir */}
        {!isEditing && <Button type="text" icon={<EditOutlined />} onClick={handleEdit} />}
      </Space>
      
      {/* Düzenleme moduna göre butonları veya durumu göster */}
      {isEditing ? (
        <Space>
          <Select value={editedStatus} onChange={setEditedStatus} style={{ width: 100 }} size="small">
            <Option value="Aktif">Aktif</Option>
            <Option value="Pasif">Pasif</Option>
            <Option value="Bloke">Bloke</Option>
          </Select>
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
