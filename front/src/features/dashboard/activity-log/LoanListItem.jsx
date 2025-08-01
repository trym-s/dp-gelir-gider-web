import React from 'react';
import { List, Typography, Tag } from 'antd';
import { WalletOutlined } from '@ant-design/icons';
import { formatCurrency } from '../../../utils/formatter';
import styles from '../styles/ActivityLog.module.css';

const { Text } = Typography;

const LoanListItem = ({ loan }) => {
  return (
    <List.Item className={styles.summaryListItem}>
      <List.Item.Meta
        avatar={<WalletOutlined className={styles.listItemIcon} style={{ color: '#8884d8' }} />}
        title={<Text className={styles.listItemTitle}>{loan.name}</Text>}
        description={
          <Text type="secondary" className={styles.listItemDescription}>
            Kalan Anapara: <Text strong style={{ color: '#d48806' }}>{formatCurrency(loan.remaining_principal)}</Text>
          </Text>
        }
      />
      <Tag>{loan.bank_account.bank.name}</Tag>
    </List.Item>
  );
};

export default LoanListItem;