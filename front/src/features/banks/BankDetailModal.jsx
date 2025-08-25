// src/features/banks/BankDetailModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Typography, Row, Col, Spin, Alert, List, Tabs, Avatar, Card, Tooltip, Button } from 'antd';
import styled from 'styled-components';
import { getBankSummary } from '../../api/bankService';
import { getLoansByBankId } from '../../api/loanService';
import FinancialHealthCard from './charts/FinancialHealthCard';
import LoanHealthCard from './charts/LoanHealthCard';
import BankChartsContainer from './charts/BankChartsContainer'; // Import the new container
import AccountListItem from './AccountListItem'; // Geliştirilmiş liste elemanı
import CreditCardListItem from '../credits/credit-cards/components/CreditCardListItem';
import CreditCardModal from '../credits/credit-cards/components/CreditCardModal';
import LoanDetailModal from '../credits/loans/LoanDetailModal';
import StyledChartCard from '../../components/StyledChartCard';
import { WalletOutlined, CreditCardOutlined, PercentageOutlined, AppstoreOutlined } from '@ant-design/icons';

const { Title } = Typography;
const { TabPane } = Tabs;
const Header = styled.div`
  display: flex;
  align-items: center;
  padding: 0 24px;
  margin-bottom: 16px;
`;
const Logo = styled.img`
  width: 48px;
  height: 48px;
  object-fit: contain;
  margin-right: 16px;
`;
const ListWrapper = styled.div`
  max-height: 250px; // Adjusted height to fit within the card
  overflow-y: auto;
  margin: -24px -24px; /* Counteract TabPane padding */
`;
const ClickableListItem = styled(List.Item)`
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #f0f0f0;
  }
`;
const BankDetailModal = ({ bank, onClose, allCreditCardsGrouped, onTransactionSubmit, onEditClick }) => {
  const [summaryData, setSummaryData] = useState(null);
  const [bankLoans, setBankLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCreditCard, setSelectedCreditCard] = useState(null);
  const [isCreditCardModalVisible, setIsCreditCardModalVisible] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [isLoanModalVisible, setIsLoanModalVisible] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(null); // null for all accounts

  const handleCreditCardClick = (card) => {
    setSelectedCreditCard(card);
    setIsCreditCardModalVisible(true);
  };
  const handleCreditCardModalClose = () => {
    setIsCreditCardModalVisible(false);
    setSelectedCreditCard(null);
  };
  const handleLoanClick = (loan) => {
    setSelectedLoan(loan);
    setIsLoanModalVisible(true);
  };
  const handleLoanModalClose = () => {
    setIsLoanModalVisible(false);
    setSelectedLoan(null);
  };
  useEffect(() => {
    if (bank) {
      const fetchSummaryAndLoans = async () => {
        try {
          setLoading(true);
          const [summaryResponse, loansResponse] = await Promise.all([
            getBankSummary(bank.id, selectedAccountId),
            getLoansByBankId(bank.id, selectedAccountId)
          ]);
          setSummaryData(summaryResponse.data);
          setBankLoans(loansResponse.data);
          console.log("Summary Data Updated:", summaryResponse.data); // DEBUG LOGGING
        } catch (err) {
          setError('Veriler yüklenirken bir hata oluştu.');
        } finally {
          setLoading(false);
        }
      };
      fetchSummaryAndLoans();
    }
  }, [bank, selectedAccountId]);
  if (!bank) return null;
  const bankCreditCards = allCreditCardsGrouped[bank.name] || [];
  const bankAccounts = bank.accounts || [];
  return (
    <>
      <Modal
        title={
          <Header>
            <Logo src={bank.logo_url} alt={`${bank.name} logo`} />
            <Title level={4} style={{ margin: 0 }}>{bank.name} Bankası Detayları</Title>
          </Header>
        }
        open={true}
        onCancel={onClose}
        footer={null}
        width={1200} // Increased width to accommodate the new layout
        destroyOnClose
      >
        {loading ? (
          <Spin style={{ display: 'block', margin: '50px auto' }} />
        ) : error ? (
          <Alert message="Hata" description={error} type="error" showIcon />
        ) : summaryData ? (
          <>
            <Row gutter={[24, 24]} style={{ padding: '0 24px 24px 24px' }}>
              <Col xs={24} lg={8}>
                <FinancialHealthCard bank_id={bank.id} selectedAccountId={selectedAccountId} />
              </Col>
              <Col xs={24} lg={8}>
                <LoanHealthCard loanSummary={summaryData} />
              </Col>
              <Col xs={24} lg={8}>
                <StyledChartCard>
                  <Tabs defaultActiveKey="1" size="small" centered>
                    <TabPane 
                      tab={
                        <Tooltip title={`Hesaplar (${bankAccounts.length})`}>
                          <WalletOutlined />
                        </Tooltip>
                      } 
                      key="1"
                    >
                      <ListWrapper>
                        <Button 
                          type={!selectedAccountId ? 'primary' : 'default'} 
                          onClick={() => setSelectedAccountId(null)}
                          style={{ marginBottom: 8, width: '100%' }}
                          icon={<AppstoreOutlined />}
                        >
                          Tüm Hesaplar
                        </Button>
                        <List
                          itemLayout="horizontal"
                          dataSource={bankAccounts}
                          renderItem={account => (
                            <AccountListItem 
                              account={account} 
                              isSelected={selectedAccountId === account.id}
                              onSelect={() => setSelectedAccountId(account.id)}
                            />
                          )}
                          locale={{ emptyText: 'Bu bankaya ait hesap bulunmamaktadır.' }}
                        />
                      </ListWrapper>
                    </TabPane>
                    <TabPane 
                      tab={
                        <Tooltip title={`Kredi Kartları (${bankCreditCards.length})`}>
                          <CreditCardOutlined />
                        </Tooltip>
                      } 
                      key="2"
                    >
                      <ListWrapper>
                        <List
                          itemLayout="horizontal"
                          dataSource={bankCreditCards}
                          renderItem={card => <CreditCardListItem creditCard={card} onClick={() => handleCreditCardClick(card)} />}
                          locale={{ emptyText: 'Bu bankaya ait kredi kartı bulunmamaktadır.' }}
                        />
                      </ListWrapper>
                    </TabPane>
                    <TabPane 
                      tab={
                        <Tooltip title={`Krediler (${bankLoans.length})`}>
                          <PercentageOutlined />
                        </Tooltip>
                      } 
                      key="3"
                    >
                      <ListWrapper>
                        <List
                          itemLayout="horizontal"
                          dataSource={bankLoans}
                          renderItem={loan => (
                            <ClickableListItem onClick={() => handleLoanClick(loan)}>
                              <List.Item.Meta
                                avatar={<Avatar icon={<PercentageOutlined />} />}
                                title={loan.name}
                                description={`Kalan Anapara: ${parseFloat(loan.remaining_principal)?.toFixed(2)} ₺`}
                              />
                            </ClickableListItem>
                          )}
                          locale={{ emptyText: 'Bu bankaya ait kredi bulunmamaktadır.' }}
                        />
                      </ListWrapper>
                    </TabPane>
                  </Tabs>
                </StyledChartCard>
              </Col>
            </Row>

            <Row gutter={[24, 24]} style={{ padding: '0 24px 24px 24px' }}>
              <Col span={24}>
                <BankChartsContainer bank_id={bank.id} selectedAccountId={selectedAccountId} />
              </Col>
            </Row>
          </>
        ) : null}
      </Modal>
      {selectedCreditCard && (
        <CreditCardModal
          card={selectedCreditCard}
          transactions={selectedCreditCard.transactions || []}
          visible={isCreditCardModalVisible}
          onClose={handleCreditCardModalClose}
          onTransactionSubmit={onTransactionSubmit}
          onEditClick={onEditClick}
        />
      )}
      <LoanDetailModal
        loan={selectedLoan}
        visible={isLoanModalVisible}
        onClose={handleLoanModalClose}
      />
    </>
  );
};
export default BankDetailModal;
