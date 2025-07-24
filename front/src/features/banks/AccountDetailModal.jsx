import React from 'react';
import { Modal, Typography, Row, Col, Statistic, List, Button, Tag } from 'antd';
import styled from 'styled-components';

const { Title, Text } = Typography;

const StyledModal = styled(Modal)`
  .ant-modal-content {
    border-radius: 12px;
  }
`;

const Header = styled.div`
  margin-bottom: 24px;
`;

const ActionButtons = styled.div`
  margin-top: 24px;
  display: flex;
  gap: 8px;
`;

const AccountDetailModal = ({ account, onClose }) => {
  if (!account) return null;

  // Placeholder data for transactions
  const transactions = [
    { id: 1, type: 'expense', description: 'Market Alışverişi', amount: -150.75, date: '2025-07-20' },
    { id: 2, type: 'income', description: 'Maaş', amount: 5000, date: '2025-07-15' },
    { id: 3, type: 'expense', description: 'Fatura Ödemesi - Elektrik', amount: -250.00, date: '2025-07-18' },
  ];

  return (
    <StyledModal
      title=""
      visible={true}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <Header>
        <Title level={3} style={{ margin: 0 }}>{account.name}</Title>
        <Text type="secondary">{account.bankName}</Text>
      </Header>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={12}>
          <Statistic title="Güncel Bakiye" value={`${account.balance} ${account.currency}`} />
        </Col>
        <Col span={12}>
          <Text strong>IBAN</Text>
          <p>{account.iban || 'N/A'}</p>
        </Col>
      </Row>

      <Title level={4}>Son Hareketler</Title>
      <List
        itemLayout="horizontal"
        dataSource={transactions}
        renderItem={item => (
          <List.Item>
            <List.Item.Meta
              title={item.description}
              description={item.date}
            />
            <Tag color={item.type === 'income' ? 'green' : 'red'}>
              {item.amount.toFixed(2)} {account.currency}
            </Tag>
          </List.Item>
        )}
      />

      <ActionButtons>
        <Button type="primary">Yeni Gider Ekle</Button>
        <Button>Yeni Gelir Ekle</Button>
        <Button type="link">Tüm İşlemleri Gör</Button>
      </ActionButtons>
    </StyledModal>
  );
};

export default AccountDetailModal;
