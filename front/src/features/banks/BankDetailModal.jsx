// src/features/banks/BankDetailModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Typography, Row, Col, Spin, Alert, List, Tabs, Avatar } from 'antd';
import styled from 'styled-components';
import { getBankSummary } from '../../api/bankService';
import { getLoansByBankId } from '../../api/loanService';
import FinancialHealthCard from './charts/FinancialHealthCard';
import LoanHealthCard from './charts/LoanHealthCard';
import AccountListItem from './AccountListItem'; // Geliştirilmiş liste elemanı
import CreditCardListItem from '../credits/credit-cards/components/CreditCardListItem';
import CreditCardModal from '../credits/credit-cards/components/CreditCardModal';
import LoanDetailModal from '../credits/loans/LoanDetailModal';
import { WalletOutlined, CreditCardOutlined, PercentageOutlined } from '@ant-design/icons';

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
  max-height: 300px;
  overflow-y: auto;
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
            getBankSummary(bank.id),
            getLoansByBankId(bank.id)
          ]);
          setSummaryData(summaryResponse.data);
          setBankLoans(loansResponse.data);
        } catch (err) {
          setError('Veriler yüklenirken bir hata oluştu.');
        } finally {
          setLoading(false);
        }
      };
      fetchSummaryAndLoans();
    }
  }, [bank]);

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
        width={1100}
        destroyOnClose
      >
        {loading ? (
          <Spin style={{ display: 'block', margin: '50px auto' }} />
        ) : error ? (
          <Alert message="Hata" description={error} type="error" showIcon />
        ) : summaryData ? (
          <>
            <Row gutter={[24, 24]} style={{ padding: '0 24px 24px 24px' }}>
              <Col xs={24} md={8}>
                <FinancialHealthCard creditCards={bankCreditCards} />
              </Col>
              <Col xs={24} md={8}>
                <LoanHealthCard loanSummary={summaryData} />
              </Col>
              <Col xs={24} md={8}>
                  {/* Diğer analizler için boş bir kart veya yeni bir analiz kartı eklenebilir */}
              </Col>
            </Row>

            <Tabs defaultActiveKey="1" style={{ padding: '0 24px' }}>
              <TabPane tab={<span><WalletOutlined /> Hesaplar ({bankAccounts.length})</span>} key="1">
                <ListWrapper>
                  <List
                    itemLayout="horizontal"
                    dataSource={bankAccounts}
                    renderItem={account => <AccountListItem account={account} />}
                    locale={{ emptyText: 'Bu bankaya ait hesap bulunmamaktadır.' }}
                  />
                </ListWrapper>
              </TabPane>
              <TabPane tab={<span><CreditCardOutlined /> Kredi Kartları ({bankCreditCards.length})</span>} key="2">
                <ListWrapper>
                  <List
                    itemLayout="horizontal"
                    dataSource={bankCreditCards}
                    renderItem={card => <CreditCardListItem creditCard={card} onClick={() => handleCreditCardClick(card)} />}
                    locale={{ emptyText: 'Bu bankaya ait kredi kartı bulunmamaktadır.' }}
                  />
                </ListWrapper>
              </TabPane>
               <TabPane tab={<span><PercentageOutlined /> Krediler ({bankLoans.length})</span>} key="3">
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
