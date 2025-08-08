import React from 'react';
import { List, Typography, Avatar } from 'antd';
import { WalletOutlined } from '@ant-design/icons';
import { formatCurrency } from '../../../utils/formatter';
import LimitProgressBar from '../../credits/credit-cards/components/LimitProgressBar'; // LimitProgressBar import edildi
import styles from '../styles/ActivityLog.module.css';

const { Text } = Typography;

const LoanListItem = ({ loan, logoUrl, onClick }) => {
  const totalDebt = loan.monthly_payment_amount * loan.term_months;
  const remainingDebt = totalDebt - (loan.total_paid || 0);
  // Krediler için ilerleme çubuğu, ödenen miktarın toplam borca oranını göstermeli
  // Bu nedenle, usagePercentage'ı (ödenen / toplam) * 100 olarak hesaplıyoruz.
  const usagePercentage = totalDebt > 0 ? ((totalDebt - remainingDebt) / totalDebt) * 100 : 0;

  return (
    <List.Item className={`${styles.summaryListItem} ${styles.clickable}`} onClick={onClick}>
      <List.Item.Meta
        avatar={<WalletOutlined className={styles.listItemIcon} style={{ color: '#8884d8' }} />}
        title={<Text className={styles.listItemTitle}>{loan.name}</Text>}
        description={
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Text type="secondary" className={styles.listItemDescription}>
              Kalan Toplam Borç: <Text strong style={{ color: '#d48806' }}>{formatCurrency(remainingDebt)}</Text>
            </Text>
            {totalDebt > 0 && ( // Toplam borç varsa progress bar'ı göster
              <div style={{ width: '100%', marginTop: '8px' }}>
                <LimitProgressBar usagePercentage={usagePercentage} />
              </div>
            )}
          </div>
        }
      />
      <Avatar src={logoUrl} size="small" />
    </List.Item>
  );
};

export default LoanListItem;