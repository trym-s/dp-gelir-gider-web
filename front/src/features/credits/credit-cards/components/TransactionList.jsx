import React from 'react';
import { List, Typography, Tag } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { formatCurrency } from '../utils/cardUtils';

const { Text } = Typography;

const TransactionList = ({ transactions }) => {
  if (transactions.length === 0) {
    return <Text type="secondary">Bu kart için gösterilecek işlem bulunmuyor.</Text>;
  }

  return (
    <List
      itemLayout="horizontal"
      dataSource={transactions}
      renderItem={item => (
        <List.Item>
          <List.Item.Meta
            avatar={
              item.type === 'expense' ? 
              <ArrowUpOutlined style={{ color: '#cf1322', fontSize: '1.2rem' }} /> : 
              <ArrowDownOutlined style={{ color: '#389e0d', fontSize: '1.2rem' }} />
            }
            title={<Text>{item.description}</Text>}
            description={new Date(item.transaction_date).toLocaleDateString('tr-TR')}
          />
          <Text strong style={{ color: item.type === 'expense' ? '#cf1322' : '#389e0d' }}>
            {item.type === 'expense' ? '-' : '+'}
            {formatCurrency(item.amount)}
          </Text>
        </List.Item>
      )}
    />
  );
};

export default TransactionList;
