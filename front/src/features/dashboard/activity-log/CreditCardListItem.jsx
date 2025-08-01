import React from 'react';
import { List, Typography, Tag } from 'antd';
import { CreditCardOutlined } from '@ant-design/icons';
import { formatCurrency } from '../../../utils/formatter';
import styles from '../styles/ActivityLog.module.css';

const { Text } = Typography;

const CreditCardListItem = ({ card }) => {
  const bankName = card.bank_account?.bank?.name || 'Bilinmiyor';

  return (
    <List.Item className={styles.summaryListItem}>
      <List.Item.Meta
        avatar={<CreditCardOutlined className={styles.listItemIcon} style={{ color: '#1890ff' }} />}
        title={<Text className={styles.listItemTitle}>{card.name}</Text>}
        description={
          <Text type="secondary" className={styles.listItemDescription}>
            Güncel Borç: <Text strong style={{ color: '#cf1322' }}>{formatCurrency(card.current_debt)}</Text>
          </Text>
        }
      />
      <Tag>{bankName}</Tag>
    </List.Item>
  );
};

export default CreditCardListItem;