import React, { useState } from 'react';
import { Modal, Row, Col, Segmented, Typography, message, Space, Collapse, Divider, Button } from 'antd';
import { CreditCardOutlined, ShoppingCartOutlined, HistoryOutlined, EditOutlined } from '@ant-design/icons';
import CreditCard from './CreditCard';
import PaymentForm from './forms/PaymentForm';
import ExpenseForm from './forms/ExpenseForm';
import TransactionList from './TransactionList';

const { Title, Text } = Typography;
const { Panel } = Collapse;

const CreditCardModal = ({ card, transactions, visible, onClose, onTransactionSubmit, onEditClick }) => {
  const [activeView, setActiveView] = useState('expense');

  if (!card) return null;

  const handleFormSubmit = (values) => {
    onTransactionSubmit(values);
    const messageType = values.type === 'expense' ? 'Harcama' : 'Ödeme';
    message.success(`${messageType} başarıyla eklendi!`);
  };

  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));

  const modalTitle = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Title level={4} style={{ margin: 0 }}>Kredi Kartı İşlemleri</Title>
      <Button icon={<EditOutlined />} onClick={() => onEditClick(card)}>
        Kartı Düzenle
      </Button>
    </div>
  );

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={850}
      centered
      title={modalTitle}
    >
      <Row gutter={32} style={{ marginTop: '24px' }}>
        <Col span={11}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text type="secondary">İşlem Yapılan Kart</Text>
            <CreditCard card={card} isInteractive={false} />
          </Space>
        </Col>
        <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
           <div style={{ height: '100%', borderLeft: '1px solid #f0f0f0' }}></div>
        </Col>
        <Col span={11}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Segmented
              options={[
                { label: 'Harcama', value: 'expense', icon: <ShoppingCartOutlined /> },
                { label: 'Ödeme', value: 'payment', icon: <CreditCardOutlined /> },
              ]}
              value={activeView}
              onChange={setActiveView}
              block
            />
            <div style={{ padding: '24px', background: '#fafafa', borderRadius: '8px', marginTop: '16px', minHeight: '280px' }}>
              {activeView === 'expense' ? (
                <ExpenseForm card={card} onSubmit={handleFormSubmit} />
              ) : (
                <PaymentForm card={card} onSubmit={handleFormSubmit} />
              )}
            </div>
          </Space>
        </Col>
      </Row>
      <Divider />
      <Collapse ghost>
        <Panel header={<Text strong><HistoryOutlined /> İşlem Geçmişini Görüntüle</Text>} key="1">
          <TransactionList transactions={sortedTransactions} />
        </Panel>
      </Collapse>
    </Modal>
  );
};

export default CreditCardModal;
