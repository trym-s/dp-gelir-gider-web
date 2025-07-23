// BankAccountsModal.jsx
import React from 'react';
import { Modal, List, Typography, Button, message, Tag } from 'antd'; // Tag eklendi
import { CopyOutlined } from '@ant-design/icons';
import './BankAccountsModal.css';

const { Text, Title } = Typography;

const statusColors = { // Statü renkleri eklendi
  Aktif: 'green',
  Pasif: 'volcano',
  Bloke: 'gray',
};

const BankAccountsModal = ({ visible, onCancel, bank }) => {
  if (!bank) return null;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    message.success('IBAN kopyalandı!');
  };

  return (
    <Modal
      title={null} // Başlığı gizle, kendi başlığımızı yapacağız
      visible={visible}
      onCancel={onCancel}
      footer={null}
      width={600} // Daha geniş bir modal
      className="bank-accounts-modal"
    >
      <div className="modal-header-custom">
        <Title level={4} className="modal-bank-name">{bank.name}</Title>
        <Tag className={`bank-status-tag ${bank.status.toLowerCase()}`} color={statusColors[bank.status]}>
          {bank.status}
        </Tag>
      </div>

      <div className="modal-body-content">
        <Title level={5}>Hesap Bilgileri:</Title>
        <List
          itemLayout="horizontal"
          dataSource={bank.accounts}
          renderItem={(account) => (
            <List.Item className="account-list-item">
              <List.Item.Meta
                title={<Text strong>{account.name}</Text>}
                description={
                  <div className="iban-detail-row">
                    <Text code>{account.iban}</Text> {/* IBAN kodu olarak göster */}
                    <CopyOutlined
                      className="copy-icon-modal"
                      onClick={() => copyToClipboard(account.iban)}
                    />
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </div>
    </Modal>
  );
};

export default BankAccountsModal;