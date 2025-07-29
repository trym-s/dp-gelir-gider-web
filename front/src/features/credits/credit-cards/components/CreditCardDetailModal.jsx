import React from 'react';
import { Modal, Typography, Descriptions, Tag, Row, Col } from 'antd';
import dayjs from 'dayjs';
import CreditCard from './CreditCard'; // CreditCard bileşenini import ediyoruz

const { Title } = Typography;

const CreditCardDetailModal = ({ creditCard, onClose }) => {
  if (!creditCard) return null;

  return (
    <Modal
      title={<Title level={4} style={{ margin: 0 }}>{creditCard.name} Detayları</Title>}
      open={true} // 'visible' yerine 'open' kullanılıyor
      onCancel={onClose}
      footer={null}
      width={1000} // Genişliği artırdık
    >
      <Row gutter={24}>
        <Col span={12}>
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Banka">{creditCard.bank_account.bank.name}</Descriptions.Item>
            <Descriptions.Item label="Kart Adı">{creditCard.name}</Descriptions.Item>
            <Descriptions.Item label="Kart Numarası">{creditCard.credit_card_no}</Descriptions.Item>
            <Descriptions.Item label="Limit">{creditCard.limit}</Descriptions.Item>
            <Descriptions.Item label="Güncel Borç">{creditCard.current_debt}</Descriptions.Item>
            <Descriptions.Item label="Kullanılabilir Limit">{creditCard.available_limit}</Descriptions.Item>
            <Descriptions.Item label="Hesap Kesim Günü">Ayın {creditCard.statement_day}. günü</Descriptions.Item>
            <Descriptions.Item label="Son Ödeme Günü">Ayın {creditCard.due_day}. günü</Descriptions.Item>
          </Descriptions>
        </Col>
        <Col span={12}>
          {/* CreditCard bileşenini burada gösteriyoruz */}
          <CreditCard card={creditCard} isInteractive={false} />
        </Col>
      </Row>
    </Modal>
  );
};

export default CreditCardDetailModal;
