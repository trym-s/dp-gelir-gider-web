import React from 'react';
import { Typography, Row, Col, Space, List, Tabs } from 'antd';
import { WalletOutlined, CreditCardOutlined, PercentageOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import AccountListItem from './AccountListItem';
import CreditCardListItem from '../credits/credit-cards/components/CreditCardListItem';
import LoanListItem from '../credits/loans/components/LoanListItem';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

// --- STYLED COMPONENTS ---

const StyledCard = styled.div`
  background: white;
  border-radius: 16px;
  padding: 20px;
  transition: box-shadow 0.3s ease-in-out;
  box-shadow: 0 4px 15px rgba(0,0,0,0.06);
  margin-bottom: 24px;
  
  &:hover {
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  }
`;

const ClickableHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  cursor: pointer;
`;

const LogoContainer = styled.div`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  margin-right: 16px;
  padding: 4px;
`;

const BankLogo = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

const KpiRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
`;

const KpiLabel = styled(Text)`
  color: #595959;
  width: 130px;
  flex-shrink: 0;
`;

const ProgressBarContainer = styled.div`
  background: #f0f0f0;
  border-radius: 10px;
  height: 8px;
  flex-grow: 1;
  overflow: hidden;
`;

const ProgressBarFill = styled.div`
  height: 100%;
  border-radius: 10px;
  transition: width 0.5s ease;
`;

const ProgressText = styled(Text)`
  font-size: 12px;
  font-weight: 600;
  color: #495057;
  margin-left: 8px;
  flex-shrink: 0;
`;

const ListWrapper = styled.div`
  max-height: 250px;
  overflow-y: auto;
  margin: -24px -24px; /* Counteract TabPane padding */
`;

// --- MAIN COMPONENT ---

const BankCard = ({ bank, creditCards, loans, loanSummary, creditCardSummary, onBankClick, onAccountClick, onCreditCardClick, onLoanClick }) => {

  const accountsCount = bank.accounts?.length || 0;
  const cardsCount = creditCards?.length || 0;
  const loansCount = loans?.length || 0;

  const totalCreditLimit = creditCardSummary.total_credit_limit || 0;
  const totalCurrentDebt = creditCardSummary.total_current_debt || 0;
  const creditCardLimitUsage = totalCreditLimit > 0 ? (totalCurrentDebt / totalCreditLimit) * 100 : 0;

  const totalLoanAmount = loanSummary.total_loan_amount || 0;
  const totalPaidAmount = loanSummary.total_paid_amount || 0;
  const loanProgress = totalLoanAmount > 0 ? (totalPaidAmount / totalLoanAmount) * 100 : 0;

  const getLimitBarColor = (usage) => {
    if (usage > 80) return '#ff4d4f';
    if (usage > 60) return '#faad14';
    return '#40a9ff';
  };
  
  return (
    <StyledCard>
      <ClickableHeader onClick={() => onBankClick(bank)}>
        <LogoContainer>
          <BankLogo src={bank.logo_url || '/default-bank-logo.png'} alt={`${bank.name} Logo`} />
        </LogoContainer>
        <Title level={5} style={{ margin: 0, flex: 1 }}>{bank.name}</Title>
      </ClickableHeader>

      <div>
        <KpiRow>
          <KpiLabel>Kredi Kartı Limiti:</KpiLabel>
          <ProgressBarContainer>
            <ProgressBarFill style={{ width: `${creditCardLimitUsage}%`, background: getLimitBarColor(creditCardLimitUsage) }} />
          </ProgressBarContainer>
          <ProgressText>{creditCardLimitUsage.toFixed(0)}%</ProgressText>
        </KpiRow>
        <KpiRow>
          <KpiLabel>Kredi Ödemesi:</KpiLabel>
          <ProgressBarContainer>
            <ProgressBarFill style={{ width: `${loanProgress}%`, background: '#9254de' }} />
          </ProgressBarContainer>
          <ProgressText>{loanProgress.toFixed(0)}%</ProgressText>
        </KpiRow>
      </div>

      <Tabs defaultActiveKey="1" style={{ marginTop: 16 }} centered>
        <TabPane 
          tab={<Space><WalletOutlined />{`Hesaplar (${accountsCount})`}</Space>} 
          key="1"
        >
          <ListWrapper>
            <List
                dataSource={bank.accounts || []}
                renderItem={account => (
                  <AccountListItem 
                    key={account.id} 
                    account={account} 
                    disableHover={true}
                  />
                )}
                locale={{ emptyText: 'Bu bankaya ait hesap bulunmamaktadır.' }}
            />
          </ListWrapper>
        </TabPane>
        <TabPane 
          tab={<Space><CreditCardOutlined />{`Kredi Kartları (${cardsCount})`}</Space>} 
          key="2"
        >
          <ListWrapper>
            <List
                dataSource={creditCards || []}
                renderItem={card => (
                  <CreditCardListItem
                    key={card.id}
                    creditCard={card}
                    onClick={() => onCreditCardClick(card)}
                  />
                )}
                locale={{ emptyText: 'Bu bankaya ait kredi kartı bulunmamaktadır.' }}
              />
          </ListWrapper>
        </TabPane>
        <TabPane 
          tab={<Space><PercentageOutlined />{`Krediler (${loansCount})`}</Space>} 
          key="3"
        >
          <ListWrapper>
            <List
                dataSource={loans || []}
                renderItem={loan => (
                  <LoanListItem
                    key={loan.id}
                    loan={loan}
                    onClick={() => onLoanClick(loan)}
                  />
                )}
                locale={{ emptyText: 'Bu bankaya ait kredi bulunmamaktadır.' }}
              />
          </ListWrapper>
        </TabPane>
      </Tabs>

    </StyledCard>
  );
}

export default BankCard;
