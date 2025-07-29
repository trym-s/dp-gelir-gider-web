import React, { useState, useEffect } from 'react';
import { Modal, Typography, Row, Col, Statistic, List, Avatar, Spin, Alert, Card } from 'antd';
import styled from 'styled-components';
import { getBankSummary } from '../../api/bankService';
import FinancialHealthCard from '../credits/credit-cards/components/FinancialHealthCard';
import LoanHealthCard from './charts/LoanHealthCard'; 
const { Title, Text } = Typography;

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
  margin-right: 16px;
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

const StyledFinancialHealthCardContainer = styled(Card)`
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  padding: 1px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;

  .ant-card-head {
    font-size: 0.9em;
  }
  .ant-statistic-content {
    font-size: 1.2em;
  }
`;

const BankDetailModal = ({ bank, onClose, allCreditCardsGrouped }) => {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (bank) {
      const fetchSummaryData = async () => {
        try {
          setLoading(true);
          const summaryResponse = await getBankSummary(bank.id);
          console.log("BankDetailModal - summaryResponse.data:", summaryResponse.data);
          setSummaryData(summaryResponse.data);
        } catch (err) {
          setError('Özet verileri yüklenirken bir hata oluştu.');
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchSummaryData();
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
            <Col span={12}>
                <StyledFinancialHealthCardContainer>
                    <FinancialHealthCard creditCards={bankCreditCards} />
                </StyledFinancialHealthCardContainer>
            </Col>

            {/* Kredi Sağlığı Kartı (Yeni) */}
            <Col span={12}>
                {/* StyledLoanHealthCard yerine LoanHealthCard doğrudan kullanılıyor */}
                <LoanHealthCard loanSummary={summaryData} />
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
            {/* Hesaplar Listesi */}
            <Col span={12}>
                <SectionTitle level={4}>Hesaplar</SectionTitle>
                <AccountsListWrapper>
                {bank.accounts.length > 0 ? (
                    <List
                        itemLayout="horizontal"
                        dataSource={bank.accounts}
                        renderItem={item => (
                        <List.Item>
                            <List.Item.Meta
                            avatar={<Avatar>{item.currency ? item.currency.slice(0,1) : '₺'}</Avatar>}
                            title={<Text strong>{item.name}</Text>}
                            description={`IBAN: ${item.iban_number || 'N/A'}${typeof item.balance === 'number' ? ` - Bakiye: ${item.balance.toFixed(2)} ${item.currency}` : ''}`}
                            />
                        </List.Item>
                        )}
                    />
                ) : (
                    <Text type="secondary">Bu bankaya ait hesap bulunmamaktadır.</Text>
                )}
                </AccountsListWrapper>
            </Col>
            {/* Gelecek KPI'lar için Yer Tutucu */}
            <Col span={12}>
              <SectionTitle level={4}>Gelecek Analizler</SectionTitle>
              <KpiCardWrapper>
                <p>Burada gelecekte banka bazında detaylı nakit akışı grafikleri veya diğer KPI'lar yer alacaktır.</p>
                <Statistic title="Örnek KPI" value={123.45} suffix="%" />
                <Statistic title="Başka Bir Metrik" value={98765.43} suffix="₺" />
              </KpiCardWrapper>
            </Col>
          </Row>
        </>
      ) : null}
    </StyledModal>
  );
};

export default BankDetailModal;