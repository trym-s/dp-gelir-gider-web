import React from 'react';
import { Modal, Typography, Descriptions, Tag } from 'antd';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const CreditCardDetailModal = ({ creditCard, onClose }) => {
  if (!creditCard) return null;

  return (
    <Modal
      title={<Title level={4} style={{ margin: 0 }}>{creditCard.card_name} Detayları</Title>}
      visible={true}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label="Banka">{creditCard.bank_name}</Descriptions.Item>
        <Descriptions.Item label="Kart Adı">{creditCard.card_name}</Descriptions.Item>
        <Descriptions.Item label="Kart Numarası (Son 4)">{creditCard.card_number_last_four}</Descriptions.Item>
        <Descriptions.Item label="Limit">{creditCard.credit_limit} {creditCard.currency}</Descriptions.Item>
        <Descriptions.Item label="Güncel Borç">{creditCard.current_debt} {creditCard.currency}</Descriptions.Item>
        <Descriptions.Item label="Son Ödeme Tarihi">
          {creditCard.due_date ? dayjs(creditCard.due_date).format('DD.MM.YYYY') : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Kesim Tarihi">
          {creditCard.statement_date ? dayjs(creditCard.statement_date).format('DD.MM.YYYY') : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Durum">
          <Tag color={creditCard.status === 'Aktif' ? 'green' : 'red'}>{creditCard.status}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Açıklama">{creditCard.description || '-'}</Descriptions.Item>
      </Descriptions>
    </Modal>
  );
};

export default CreditCardDetailModal;
