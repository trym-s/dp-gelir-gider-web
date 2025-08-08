import React, { useState } from 'react';
import { Typography, Row, Col, Space, List } from 'antd';
import { WalletOutlined, CreditCardOutlined, UpOutlined, DownOutlined } from '@ant-design/icons';
import styled, { css } from 'styled-components';
import AccountListItem from './AccountListItem';
import CreditCardListItem from '../credits/credit-cards/components/CreditCardListItem';

const { Title, Text } = Typography;

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
  height: 6px;
  flex-grow: 1;
  overflow: hidden;
`;

const ProgressBarFill = styled.div`
  height: 100%;
  border-radius: 10px;
  transition: width 0.5s ease;
`;

const CardFooter = styled.div`
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
`;

const FooterItem = styled.div`
    cursor: pointer;
    transition: color 0.3s ease;
    font-weight: 500;
    color: ${props => props.active ? '#1677ff' : '#434343'};

    &:hover {
        color: #1677ff;
    }
`;

const ExpansionContainer = styled.div`
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.4s ease-in-out, margin-top 0.4s ease-in-out;

  ${props => props.isExpanded && css`
    max-height: 500px; /* Or a sufficiently large value */
    margin-top: 16px;
  `}
`;

// --- MAIN COMPONENT ---

const BankCard = ({ bank, creditCards, loanSummary, creditCardSummary, onBankClick, onAccountClick, onCreditCardClick }) => {
  const [expandedSection, setExpandedSection] = useState(null);

  const handleToggleSection = (section) => {
    setExpandedSection(prevSection => (prevSection === section ? null : section));
  };

  const accountsCount = bank.accounts?.length || 0;
  const cardsCount = creditCards?.length || 0;

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
        </KpiRow>
        <KpiRow>
          <KpiLabel>Kredi Ödemesi:</KpiLabel>
          <ProgressBarContainer>
            <ProgressBarFill style={{ width: `${loanProgress}%`, background: '#9254de' }} />
          </ProgressBarContainer>
        </KpiRow>
      </div>

      <CardFooter>
        <Row justify="space-around">
          <Col>
            <FooterItem onClick={() => handleToggleSection('accounts')} active={expandedSection === 'accounts'}>
              <Space>
                <WalletOutlined />
                {`Hesaplar (${accountsCount})`}
                {expandedSection === 'accounts' ? <UpOutlined/> : <DownOutlined/>}
              </Space>
            </FooterItem>
          </Col>
          <Col>
            <FooterItem onClick={() => handleToggleSection('cards')} active={expandedSection === 'cards'}>
              <Space>
                <CreditCardOutlined />
                {`Kredi Kartları (${cardsCount})`}
                {expandedSection === 'cards' ? <UpOutlined/> : <DownOutlined/>}
              </Space>
            </FooterItem>
          </Col>
        </Row>
      </CardFooter>

      <ExpansionContainer isExpanded={expandedSection === 'accounts'}>
        <List
            dataSource={bank.accounts || []}
            renderItem={account => (
              <AccountListItem 
                key={account.id} 
                account={account} 
                onClick={() => onAccountClick(account, bank)} 
                disableHover={true}
              />
            )}
            locale={{ emptyText: 'Bu bankaya ait hesap bulunmamaktadır.' }}
        />
      </ExpansionContainer>
      
      <ExpansionContainer isExpanded={expandedSection === 'cards'}>
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
      </ExpansionContainer>

    </StyledCard>
  );
}

export default BankCard;