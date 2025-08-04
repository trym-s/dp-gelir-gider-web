import React from 'react';
import { List, Typography, Avatar } from 'antd';
import { CreditCardOutlined } from '@ant-design/icons';
import { formatCurrency } from '../../../utils/formatter';
import styles from '../styles/ActivityLog.module.css';

const { Text } = Typography;

const CreditCardListItem = ({ card, logoUrl, onClick }) => {
  return (
    <List.Item className={`${styles.summaryListItem} ${styles.clickable}`} onClick={onClick}>
      <List.Item.Meta
        avatar={<CreditCardOutlined className={styles.listItemIcon} style={{ color: '#1890ff' }} />}
        title={<Text className={styles.listItemTitle}>{card.name}</Text>}
        description={
          <Text type="secondary" className={styles.listItemDescription}>
            Güncel Borç: <Text strong style={{ color: '#cf1322' }}>{formatCurrency(card.current_debt)}</Text>
          </Text>
        }
      />
      <Avatar src={logoUrl} size="small" />
    </List.Item>
  );
};

export default CreditCardListItem;
