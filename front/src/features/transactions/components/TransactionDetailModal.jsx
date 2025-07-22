import React from 'react';
import { Modal, Descriptions, Button, Space, Tag, Typography } from 'antd';
import dayjs from 'dayjs';

const { Text } = Typography;

const TransactionDetailModal = ({ visible, onCancel, onEdit, onDelete, onAddPayment, transaction, config }) => {
  if (!transaction) return null;

  const { title, statusMap } = config;
  const entityName = title.slice(0, -1); // "Giderler" -> "Gider"

  const getStatusTag = (status) => {
    const statusInfo = statusMap[status] || { color: 'default', text: status };
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
  };

  const items = [
      { key: 'description', label: 'Açıklama', children: transaction.description, span: 2 },
      { key: 'status', label: 'Durum', children: getStatusTag(transaction.status) },
      { key: 'amount', label: 'Tutar', children: <Text strong style={{ fontSize: '16px' }}>{`${transaction.amount || transaction.total_amount} ₺`}</Text> },
      { key: 'date', label: 'Tarih', children: dayjs(transaction.date).format('DD/MM/YYYY') },
      { key: 'remaining_amount', label: 'Kalan Tutar', children: <Text type="danger" strong style={{ fontSize: '16px' }}>{`${transaction.remaining_amount} ₺`}</Text> },
      ...config.list.columns
        .map((col, index) => {
            const key = Array.isArray(col.dataIndex) ? col.dataIndex[0] : col.dataIndex;
            const value = Array.isArray(col.dataIndex) ? transaction[key]?.name : transaction[key];
            if (!value) return null;
            return { key: `dyn-${index}`, label: col.title, children: value };
        })
        .filter(Boolean),
      { key: 'payments', label: 'İşlem Sayısı', children: `${transaction.payments?.length || transaction.receipts?.length || 0} adet` },
  ];

  return (
    <Modal
      title={`${entityName} Detayı`}
      open={visible}
      onCancel={onCancel}
      width={600}
      footer={[
        <Button key="back" onClick={onCancel}>
          Kapat
        </Button>,
        <Button key="delete" danger onClick={() => onDelete(transaction.id)}>
          Sil
        </Button>,
        <Button key="payment" onClick={() => onAddPayment(transaction)} disabled={transaction.status === 'PAID' || transaction.status === 'RECEIVED'}>
          {config.entity === 'expense' ? 'Ödeme Ekle' : 'Tahsilat Ekle'}
        </Button>,
        <Button key="submit" type="primary" onClick={() => onEdit(transaction)}>
          Düzenle
        </Button>,
      ]}
    >
      <Descriptions bordered layout="vertical" column={2} items={items} />
    </Modal>
  );
};

export default TransactionDetailModal;
