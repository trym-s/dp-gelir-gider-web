import React from 'react';
import { Collapse, Spin, Alert, Empty, Typography, List } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getCreditCards } from '../../../api/creditCardService';
import { getLoans } from '../../../api/loanService';
import CreditCardListItem from './CreditCardListItem';
import LoanListItem from './LoanListItem';
import { CreditCardOutlined, BankOutlined } from '@ant-design/icons';
import styles from '../styles/ActivityLog.module.css';

const { Title } = Typography;

const CustomPanelHeader = ({ title, icon, count }) => (
  <div className={styles.panelHeader}>
    {icon}
    <Title level={5} className={styles.panelHeaderText}>
      {title} ({count})
    </Title>
  </div>
);

export default function CreditsSummary() {
  const { data: creditCards, isLoading: isLoadingCards, isError: isErrorCards, error: errorCards } = useQuery({
    queryKey: ['creditCardsDashboard'],
    queryFn: getCreditCards,
  });

  const { data: loansResponse, isLoading: isLoadingLoans, isError: isErrorLoans, error: errorLoans } = useQuery({
    queryKey: ['loansDashboard'],
    queryFn: getLoans,
  });
  
  // Gelen yanıtın .data özelliğini kullanarak kredi listesini alın
  const loans = loansResponse?.data || [];

  const renderContent = (isLoading, isError, error, data, renderItem, emptyMessage) => {
    if (isLoading) return <div className={styles.loader}><Spin /></div>;
    if (isError) return <Alert message={error?.message || 'Veri yüklenemedi.'} type="error" showIcon />;
    if (!data || data.length === 0) return <Empty description={emptyMessage} image={Empty.PRESENTED_IMAGE_SIMPLE} />;

    return (
      <div className={styles.listContainer}>
        <List
            dataSource={data}
            renderItem={item => renderItem(item)}
        />
      </div>
    );
  };

  return (
    <div className={styles.creditsSummaryCard}>
      <Collapse ghost accordion expandIconPosition="end" defaultActiveKey={['1']}>
        <Collapse.Panel
          header={
            <CustomPanelHeader
              title="Kredi Kartları"
              icon={<CreditCardOutlined />}
              count={creditCards?.length || 0}
            />
          }
          key="1"
        >
          {renderContent(
            isLoadingCards,
            isErrorCards,
            errorCards,
            creditCards,
            (card) => <CreditCardListItem key={card.id} card={card} />,
            "Kredi kartı bulunmuyor."
          )}
        </Collapse.Panel>
        <Collapse.Panel
          header={
            <CustomPanelHeader
              title="Krediler"
              icon={<BankOutlined />}
              count={loans?.length || 0}
            />
          }
          key="2"
        >
          {renderContent(
            isLoadingLoans,
            isErrorLoans,
            errorLoans,
            loans,
            (loan) => <LoanListItem key={loan.id} loan={loan} />,
            "Kredi bulunmuyor."
          )}
        </Collapse.Panel>
      </Collapse>
    </div>
  );
}