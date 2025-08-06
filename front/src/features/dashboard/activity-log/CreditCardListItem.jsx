import React from 'react';
import { List, Typography, Avatar } from 'antd';
import { CreditCardOutlined } from '@ant-design/icons';
import { formatCurrency } from '../../../utils/formatter';
import LimitProgressBar from '../../credits/credit-cards/components/LimitProgressBar'; // LimitProgressBar import edildi
import styles from '../styles/ActivityLog.module.css';

const { Text } = Typography;

const CreditCardListItem = ({ card, logoUrl, onClick }) => {
  const limit = parseFloat(card.limit) || 0;
  const currentDebt = parseFloat(card.current_debt) || 0;
  const usagePercentage = limit > 0 ? (currentDebt / limit) * 100 : 0;

  return (
    <List.Item className={`${styles.summaryListItem} ${styles.clickable}`} onClick={onClick}>
      <List.Item.Meta
        avatar={<CreditCardOutlined className={styles.listItemIcon} style={{ color: '#1890ff' }} />}
        title={<Text className={styles.listItemTitle}>{card.name}</Text>}
        description={
          <>
            <Text type="secondary" className={styles.listItemDescription}>
              Güncel Borç: <Text strong style={{ color: '#cf1322' }}>{formatCurrency(card.current_debt)}</Text>
            </Text>
            {limit > 0 && ( // Limit varsa progress bar'ı göster
              <div style={{ width: '100%', marginTop: '8px' }}>
                <LimitProgressBar usagePercentage={usagePercentage} />
              </div>
            )}
          </>
        }
      />
      <Avatar src={logoUrl} size="small" />
    </List.Item>
  );
};

export default CreditCardListItem;
