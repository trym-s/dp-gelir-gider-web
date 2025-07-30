import React, { useState, useEffect } from 'react';
import { Modal, Typography, Row, Col, Statistic, List, Avatar, Spin, Alert, Card, Tabs } from 'antd';
import styled from 'styled-components';
import { getBankSummary } from '../../api/bankService';
import { getLoansByBankId } from '../../api/loanService';
import FinancialHealthCard from './charts/FinancialHealthCard';
import LoanHealthCard from './charts/LoanHealthCard';
import ExpandedLoanView from '../credits/loans/ExpandedLoanView';
import CreditCardDetailModal from '../credits/credit-cards/components/CreditCardModal';

import { WalletOutlined, CreditCardOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const StyledModal = styled(Modal)`
  .ant-modal-content {
    border-radius: 12px;
  }
  .ant-modal-header {
    border-radius: 12px 12px 0 0;
    padding-bottom: 0;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  padding-top: 24px;
`;

const Logo = styled.img`
  width: 48px;
  height: 48px;
  object-fit: contain;
`;

const SectionTitle = styled(Title)`
  margin-top: 16px !important;
  margin-bottom: 16px !important;
  font-size: 1.2em !important;
  color: #2d3748;
`;

const AccountsListWrapper = styled.div`
  background-color: #fafafa;
  border-radius: 8px;
  padding: 16px;
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid #f0f0f0;
`;

const KpiCardWrapper = styled(Card)`
  text-align: center;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  .ant-card-head {
    border-bottom: none;
    padding-bottom: 0;
  }
  .ant-card-body {
    padding-top: 0;
  }
`;

const BankDetailModal = ({ bank, onClose, allCreditCardsGrouped }) => {
  const [summaryData, setSummaryData] = useState(null);
  const [bankLoans, setBankLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoanDetailModalOpen, setIsLoanDetailModalOpen] = useState(false);
  const [selectedLoanForDetail, setSelectedLoanForDetail] = useState(null);
  const [isCreditCardDetailModalOpen, setIsCreditCardDetailModalOpen] = useState(false);
  const [selectedCreditCardForDetail, setSelectedCreditCardForDetail] = useState(null);

  useEffect(() => {
    if (bank) {
      const fetchSummaryAndLoans = async () => {
        try {
          setLoading(true);
          const [summaryResponse, loansResponse] = await Promise.all([
            getBankSummary(bank.id),
            getLoansByBankId(bank.id)
          ]);
          console.log("BankDetailModal - summaryResponse.data:", summaryResponse.data);
          console.log("BankDetailModal - loansResponse.data:", loansResponse.data);
          setSummaryData(summaryResponse.data);
          setBankLoans(loansResponse.data);
        } catch (err) {
          setError('Veriler yüklenirken bir hata oluştu.');
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchSummaryAndLoans();
    }
  }, [bank]);

  if (!bank) return null;

  const bankCreditCards = allCreditCardsGrouped[bank.name] || [];

  return (
    <StyledModal
      title=""
      visible={true}
      onCancel={onClose}
      footer={null}
      width={1000}
    >
      <Header>
        <Logo src={bank.logo_url} alt={`${bank.name} logo`} />
        <Title level={3} style={{ margin: 0 }}>{bank.name} Detayları</Title>
      </Header>

      {loading ? (
        <Spin style={{ display: 'block', margin: '50px auto' }} />
      ) : error ? (
        <Alert message="Hata" description={error} type="error" showIcon />
      ) : summaryData ? (
        <>
          <Row gutter={[16, 16]}>
            {/* Finansal Sağlık Kartı (Kredi Kartları) */}
            <Col span={8}>
                <FinancialHealthCard creditCards={bankCreditCards} />
            </Col>

            {/* Kredi Sağlığı Kartı (Yeni) */}
            <Col span={8}>
                <LoanHealthCard loanSummary={summaryData} />
            </Col>

            {/* Added a new Col to fill the remaining space */}
            <Col span={8}>
              <SectionTitle level={4}>Diğer Analizler</SectionTitle>
              <KpiCardWrapper>
                <Statistic title="Son Bakiye (TRY)" value={summaryData.total_assets_in_try?.toFixed(2)} suffix="₺" />
                {summaryData.last_updated_date && (
                  <Text type="secondary" style={{ fontSize: '0.8em', marginTop: '8px' }}>
                    Güncellenme: {summaryData.last_updated_date} ({summaryData.last_updated_period})
                  </Text>
                )}
              </KpiCardWrapper>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
            <Col span={24}>
              <Tabs defaultActiveKey="1">
                <TabPane tab="Krediler" key="1">
                  <AccountsListWrapper>
                    {bankLoans.length > 0 ? (
                      <List
                        itemLayout="horizontal"
                        dataSource={bankLoans}
                        renderItem={loan => (
                          <List.Item
                            onClick={() => {
                              setSelectedLoanForDetail(loan);
                              setIsLoanDetailModalOpen(true);
                            }}
                            style={{
                              cursor: 'pointer',
                              transition: 'background-color 0.3s ease',
                              borderRadius: '8px',
                              marginBottom: '8px',
                              padding: '12px',
                              border: '1px solid #f0f0f0',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e6f7ff'} // Ant Design blue-1
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'} // AccountsListWrapper background
                          >
                            <List.Item.Meta
                              avatar={<Avatar icon={<WalletOutlined />} />}
                              title={<Text strong>{loan.name}</Text>}
                              description={`Kalan Anapara: ${parseFloat(loan.remaining_principal)?.toFixed(2)} ₺ - Aylık Taksit: ${parseFloat(loan.monthly_payment_amount)?.toFixed(2)} ₺`}
                            />
                          </List.Item>
                        )}
                      />
                    ) : (
                      <Text type="secondary">Bu bankaya ait kredi bulunmamaktadır.</Text>
                    )}
                  </AccountsListWrapper>
                </TabPane>
                <TabPane tab="Kredi Kartları" key="2">
                  <AccountsListWrapper>
                    {bankCreditCards.length > 0 ? (
                      <List
                        itemLayout="horizontal"
                        dataSource={bankCreditCards}
                        renderItem={card => (
                          <List.Item
                            onClick={() => {
                              setSelectedCreditCardForDetail(card);
                              setIsCreditCardDetailModalOpen(true);
                            }}
                            style={{
                              cursor: 'pointer',
                              transition: 'background-color 0.3s ease',
                              borderRadius: '8px',
                              marginBottom: '8px',
                              padding: '12px',
                              border: '1px solid #f0f0f0',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e6f7ff'} // Ant Design blue-1
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'} // AccountsListWrapper background
                          >
                            <List.Item.Meta
                              avatar={<Avatar icon={<CreditCardOutlined />} />}
                              title={<Text strong>{card.card_name}{card.card_number_last_four ? ` - ${card.card_number_last_four}` : ''}</Text>}
                              description={`Limit: ${parseFloat(card.limit)?.toFixed(2)} ₺ - Borç: ${parseFloat(card.current_debt)?.toFixed(2)} ₺`}
                            />
                          </List.Item>
                        )}
                      />
                    ) : (
                      <Text type="secondary">Bu bankaya ait kredi kartı bulunmamaktadır.</Text>
                    )}
                  </AccountsListWrapper>
                </TabPane>
              </Tabs>
            </Col>
          </Row>
        </>
      ) : null}

      {isLoanDetailModalOpen && selectedLoanForDetail && (
        <Modal
          title="Kredi Detayı"
          open={isLoanDetailModalOpen}
          onCancel={() => setIsLoanDetailModalOpen(false)}
          footer={null}
          width={1200}
          destroyOnClose
        >
          <ExpandedLoanView loanId={selectedLoanForDetail.id} isActive={true} />
        </Modal>
      )}

      {isCreditCardDetailModalOpen && selectedCreditCardForDetail && (
        <CreditCardDetailModal
          card={selectedCreditCardForDetail}
          transactions={selectedCreditCardForDetail.transactions || []} // Assuming transactions are part of the card object
          visible={isCreditCardDetailModalOpen}
          onClose={() => setIsCreditCardDetailModalOpen(false)}
          onTransactionSubmit={() => {}} // Placeholder
          onEditClick={() => {}} // Placeholder
        />
      )}
    </StyledModal>
  );
};

export default BankDetailModal;