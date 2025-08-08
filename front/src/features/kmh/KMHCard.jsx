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

const statusColors = {
  'Aktif': 'success',
  'Pasif': 'warning',
  'Bloke': 'error',
};

const KMHCard = ({ bank, onCardClick, onSave }) => {
  const { name, status, kmh_limit, risk, statement_date_str } = bank;
  const kmhLimiti = bank.kmhLimiti ?? kmh_limit;
  const hesapKesimTarihi = bank.hesapKesimTarihi ?? statement_date_str;

  const [isEditing, setIsEditing] = useState(false);
  const [editedLimit, setEditedLimit] = useState(kmhLimiti);
  const [editedDate, setEditedDate] = useState(hesapKesimTarihi);
  const [editedStatus, setEditedStatus] = useState(status);

  const handleEdit = (e) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    setEditedLimit(kmhLimiti);
    setEditedDate(hesapKesimTarihi);
    setEditedStatus(status);
    setIsEditing(false);
  };

  const handleSave = (e) => {
    e.stopPropagation();
    if (onSave) {
      onSave({
        ...bank,
        kmhLimiti: editedLimit,
        hesapKesimTarihi: editedDate,
        status: editedStatus,
      });
    }
    setIsEditing(false);
  };

  const cardTitle = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Space align="center">
        <img src={bankLogoMap[bank.bank.name] || bankLogoMap['default']} alt={`${bank.bank.name} logo`} style={{ width: '24px', height: '24px', marginRight: '8px' }} />
        <Text className="bank-name">{name}</Text>
        
        {isEditing ? (
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            size="small"
            // YENİ EKLENEN CLASSNAME
            className="edit-save-button"
          />
        ) : (
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={handleEdit}
          />
        )}
      </Space>

      {isEditing ? (
        <Space>
          <Select value={editedStatus} onChange={setEditedStatus} style={{ width: 100 }} size="small">
            <Option value="Aktif">Aktif</Option>
            <Option value="Pasif">Pasif</Option>
            <Option value="Bloke">Bloke</Option>
          </Select>
          <Button icon={<CloseOutlined />} onClick={handleCancel} size="small" />
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
      onClick={() => !isEditing && onCardClick(bank)}
      title={cardTitle}
      extra={null}
    >
      <div className="kmh-details-list">
        <div className="info-row">
          <Text type="secondary">KMH Limiti:</Text>
          {isEditing ? (
            <InputNumber
              className="edit-input"
              value={editedLimit}
              formatter={(value) => `₺ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              parser={(value) => value.replace(/₺\s?|(\.*)/g, '')}
              onChange={setEditedLimit}
            />
          ) : (
            <Text strong>{(kmhLimiti || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</Text>
          )}
        </div>
        <div className="info-row">
          <Text type="secondary">Risk (Harcanan):</Text>
          <Text strong style={{ color: '#cf1322' }}>{(risk || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</Text>
        </div>
      </div>
    </Card>
  );
};

export default KMHCard;
