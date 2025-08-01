import React, { useState } from 'react';
import { Collapse, Spin, Alert, Empty, Typography, List } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getCreditCards } from '../../../api/creditCardService';
import { getLoans } from '../../../api/loanService';
import CreditCardListItem from './CreditCardListItem';
import LoanListItem from './LoanListItem';
import CreditCardDetailModal from '../../credits/credit-cards/components/CreditCardDetailModal';
import { CreditCardOutlined, BankOutlined } from '@ant-design/icons';
import styles from '../styles/ActivityLog.module.css';

const { Title } = Typography;

const bankLogoMap = {
  'Akbank': '/bank_logo/Akbank-icon.png',
  'TEB': '/bank_logo/Teb-icon.png',
  'Yapi Kredi': '/bank_logo/Yapi-Kredi-Logo.png',
  'TFKB': '/bank_logo/tfkb-logo.png',  
  'Garanti BBVA': '/bank_logo/garanti-logo.png',
  'Is Bankasi': '/bank_logo/is-bankasi-logo.png',
  'Ziraat Bankasi': '/bank_logo/ziraat-logo.png',
  'QNB': '/bank_logo/qnb-logo.png',
  'Vakifbank': '/bank_logo/vakifbank-logo.png',
  'wio Bank': '/wio-logo.png',
  'default': '/default-bank-logo.png'
};

const CustomPanelHeader = ({ title, icon, count }) => (
  <div className={styles.panelHeader}>
    {icon}
    <Title level={5} className={styles.panelHeaderText}>
      {title} ({count})
    </Title>
  </div>
);

export default function CreditsSummary() {
  const [selectedCard, setSelectedCard] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const { data: creditCards, isLoading: isLoadingCards, isError: isErrorCards, error: errorCards } = useQuery({
    queryKey: ['creditCardsDashboard'],
    queryFn: getCreditCards,
  });

  const { data: loansResponse, isLoading: isLoadingLoans, isError: isErrorLoans, error: errorLoans } = useQuery({
    queryKey: ['loansDashboard'],
    queryFn: getLoans,
  });
  
  const loans = loansResponse?.data || [];

  const handleCreditCardClick = (card) => {
    setSelectedCard(card);
    setIsModalVisible(true);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setSelectedCard(null);
  };

  const renderContent = (isLoading, isError, error, data, renderItem, emptyMessage) => {
    if (isLoading) return <div className={styles.loader}><Spin /></div>;
    if (isError) return <Alert message={error?.message || 'Veri yüklenemedi.'} type="error" showIcon />;
    if (!data || data.length === 0) return <Empty description={emptyMessage} image={Empty.PRESENTED_IMAGE_SIMPLE} />;

    return (
      <div className={styles.listContainer}>
        <List
            dataSource={data}
            renderItem={item => {
              const logoUrl = bankLogoMap[item.bank_name] || bankLogoMap['default'];
              return renderItem(item, logoUrl);
            }}
        />
      </div>
    );
  };

  return (
    <>
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
              (card, logoUrl) => <CreditCardListItem key={card.id} card={card} logoUrl={logoUrl} onClick={() => handleCreditCardClick(card)} />,
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
              (loan, logoUrl) => <LoanListItem key={loan.id} loan={loan} logoUrl={logoUrl} />,
              "Kredi bulunmuyor."
            )}
          </Collapse.Panel>
        </Collapse>
      </div>
      <CreditCardDetailModal
        card={selectedCard}
        visible={isModalVisible}
        onClose={handleModalClose}
      />
    </>
  );
}
