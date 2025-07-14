import React from 'react';
import { Modal, List, Typography, Tag } from 'antd';
import dayjs from 'dayjs';

const { Text } = Typography;

const TransactionListModal = ({ visible, title, items, onCancel, onItemClick, type }) => {
  return (
    <Modal
      title={title}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <style>{`
        .hoverable-list-item:hover {
          background-color: #f0f0f0;
        }
      `}</style>
      <List
        dataSource={items}
        renderItem={item => (
          <List.Item
            style={{ cursor: 'pointer', padding: '12px 8px', borderRadius: '4px' }}
            onClick={() => onItemClick(item)}
            className="hoverable-list-item"
          >
            <List.Item.Meta
              title={<Text>{item.description}</Text>}
              description={`Tutar: ${item.amount} ₺ - Tarih: ${dayjs(item.date).format('DD/MM/YYYY')}`}
            />
            {item.status && <Tag>{item.status}</Tag>}
          </List.Item>
        )}
      />
    </Modal>
  );
};

export default TransactionListModal;
