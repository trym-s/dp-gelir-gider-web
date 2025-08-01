import React, { useState } from 'react';
import { Collapse, Spin, Alert, Empty, Typography, List } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getCreditCards, getTransactionsForCard, addTransactionToCard } from '../../../api/creditCardService';
import { getLoans } from '../../../api/loanService';
import CreditCardListItem from './CreditCardListItem';
import LoanListItem from './LoanListItem';
import CreditCardModal from '../../credits/credit-cards/components/CreditCardModal';
import LoanDetailModal from '../../credits/loans/LoanDetailModal';
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
  const [isCardModalVisible, setIsCardModalVisible] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [isLoanModalVisible, setIsLoanModalVisible] = useState(false);

  const { data: creditCards, isLoading: isLoadingCards, isError: isErrorCards, error: errorCards, refetch: refetchCreditCards } = useQuery({
    queryKey: ['creditCardsDashboard'],
    queryFn: getCreditCards,
  });

  const { data: loansResponse, isLoading: isLoadingLoans, isError: isErrorLoans, error: errorLoans } = useQuery({
    queryKey: ['loansDashboard'],
    queryFn: getLoans,
  });
  
  const loans = loansResponse?.data || [];

  const handleCreditCardClick = async (card) => {
    setSelectedCard(card);
    setIsCardModalVisible(true);
    try {
      const response = await getTransactionsForCard(card.id);
      setTransactions(response.data);
    } catch (error) {
      console.error("İşlemler getirilirken hata oluştu:", error);
      setTransactions([]);
    }
  };

  const handleCardModalClose = () => {
    setIsCardModalVisible(false);
    setSelectedCard(null);
    setTransactions([]);
  };

  const handleLoanClick = (loan) => {
    setSelectedLoan(loan);
    setIsLoanModalVisible(true);
  };

  const handleLoanModalClose = () => {
    setIsLoanModalVisible(false);
    setSelectedLoan(null);
  };

  const handleTransactionSubmit = async (transactionDetails) => {
    if (!selectedCard) return;
    
    try {
      await addTransactionToCard(selectedCard.id, transactionDetails);
      refetchCreditCards();
      const transactionsResponse = await getTransactionsForCard(selectedCard.id);
      setTransactions(transactionsResponse.data);
      const updatedCards = await getCreditCards();
      const updatedSelectedCard = updatedCards.find(c => c.id === selectedCard.id);
      setSelectedCard(updatedSelectedCard);
    } catch (error) {
      console.error("İşlem eklenirken hata oluştu:", error);
    }
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
              (loan, logoUrl) => <LoanListItem key={loan.id} loan={loan} logoUrl={logoUrl} onClick={() => handleLoanClick(loan)} />,
              "Kredi bulunmuyor."
            )}
          </Collapse.Panel>
        </Collapse>
      </div>
      <CreditCardModal
        card={selectedCard}
        transactions={transactions}
        visible={isCardModalVisible}
        onClose={handleCardModalClose}
        onTransactionSubmit={handleTransactionSubmit}
        onEditClick={() => {}}
      />
      <LoanDetailModal
        loan={selectedLoan}
        visible={isLoanModalVisible}
        onClose={handleLoanModalClose}
      />
    </>
  );
}
