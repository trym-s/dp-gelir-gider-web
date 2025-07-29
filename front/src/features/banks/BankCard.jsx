import React, { useState } from 'react';
import { Typography } from 'antd';
import styled from 'styled-components';
import AccountListItem from './AccountListItem'; // Keep this import for future use

const { Title } = Typography;

import CreditCardListItem from '../credits/credit-cards/components/CreditCardListItem';

const StyledCard = styled.div`
  background: white;
  border-radius: 16px;
  padding: 12px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  margin-bottom: 24px;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 24px rgba(0,0,0,0.12);
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 10px;
`;

const LogoContainer = styled.div`
  width: 55px;
  height: 55px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fbfcfdff;
  border-radius: 12px;
  margin-right: 8px;
  padding: 5px;
`;

const BankLogo = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

const KpiRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 7px;
  font-size: 12px;
`;

const KpiLabel = styled.span`
  color: #666;
  flex-shrink: 0;
  width: 150px;
`;

const ProgressBar = styled.div`
  background: #e0e0e0;
  border-radius: 4px;
  height: 8px;
  flex-grow: 1;
  display: flex;
`;

const ProgressBarFill = styled.div`
  height: 8px;
  border-radius: 4px;
`;

const ClickableArea = styled.div`
  cursor: pointer;
  padding: 7px 10px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  transition: background-color 0.2s ease;
`;



const BankCard = ({ bank, creditCards, loanSummary, creditCardSummary, onBankClick, onAccountClick, onCreditCardClick }) => {
  const [isCardHovered, setCardHovered] = useState(false); // Not directly used for styling anymore, but kept for consistency if needed later
  const [expandedSection, setExpandedSection] = useState(null);

  // Dinamik renk için yardımcı fonksiyon
  const getLimitBarColor = (usage) => {
    if (usage > 80) return '#E57373'; // Muted Red
    if (usage > 60) return '#FFB74D'; // Muted Orange
    return '#64B5F6'; // Muted Blue
  };

  // Calculate accountsCount and totalBalance from real bank data
  const accountsCount = bank.accounts ? bank.accounts.length : 0;
  const totalBalance = bank.accounts
    ? bank.accounts.reduce((sum, account) => sum + (account.balance || 0), 0).toFixed(2)
    : '0.00';

  // Calculate cardsCount and limitUsage from real creditCards data
  const cardsCount = creditCards ? creditCards.length : 0;

  const totalCreditLimit = creditCardSummary.total_credit_limit || 0;
  const totalCurrentDebt = creditCardSummary.total_current_debt || 0;
  const creditCardLimitUsage = totalCreditLimit > 0 ? ((totalCurrentDebt / totalCreditLimit) * 100).toFixed(2) : 0;

  // Placeholder values for KPIs that need real data integration
  const totalLoanAmount = loanSummary.total_loan_amount || 0;
  const totalPaidAmount = loanSummary.total_paid_amount || 0;
  const loanProgress = totalLoanAmount > 0 ? ((totalPaidAmount / totalLoanAmount) * 100).toFixed(2) : 0;

  return (
    <StyledCard
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
    >
      {/* Üst Kısım */}
      <CardHeader onClick={() => onBankClick(bank)}>
        <LogoContainer>
          <BankLogo
            src={bank.logo_url || '/default-bank-logo.png'}
            alt={`${bank.name} Logo`}
          />
        </LogoContainer>
        <Title level={5} style={{ margin: 0, flex: 1 }}>{bank.name}</Title>
      </CardHeader>

      {/* Orta Kısım - YENİ TEK SATIRLIK PROGRESS BARLAR */}
      <div style={{ flexGrow: 1, padding: '5px 0' }}>

        {/* KPI 1: Kredi Limiti */}
        <KpiRow>
          <KpiLabel>Kredi Kartı Limit:</KpiLabel>
          <ProgressBar>
            <ProgressBarFill style={{ width: `${parseFloat(creditCardLimitUsage)}%`, background: getLimitBarColor(creditCardLimitUsage) }} />
          </ProgressBar>
        </KpiRow>

        

        {/* KPI 3: Kredi Ödeme */}
        <KpiRow style={{ marginBottom: 0 }}>
          <KpiLabel>Kredi Geri Ödemesi:</KpiLabel>
          <ProgressBar>
            <ProgressBarFill style={{ width: `${parseFloat(loanProgress)}%`, background: '#BA68C8' }} />
          </ProgressBar>
        </KpiRow>
      </div>

      {/* Alt Kısım - Tıklanabilir İkonlar */}
      <div style={{ display: 'flex', justifyContent: 'space-around', borderTop: '1px solid #eee', paddingTop: '10px', fontSize: '14px', alignItems: 'center' }}>
        <ClickableArea
          onClick={() => setExpandedSection(expandedSection === 'cards' ? null : 'cards')}
          style={{ background: expandedSection === 'cards' ? '#e3f2fd' : 'transparent' }}
        >
          💳 {cardsCount} Kart
          <span style={{ marginLeft: '8px', fontSize: '10px', transform: expandedSection === 'cards' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▼</span>
        </ClickableArea>
        <ClickableArea
          onClick={() => setExpandedSection(expandedSection === 'accounts' ? null : 'accounts')}
          style={{ background: expandedSection === 'accounts' ? '#e3f2fd' : 'transparent' }}
        >
          🏦 {accountsCount} Hesap
          <span style={{ marginLeft: '8px', fontSize: '10px', transform: expandedSection === 'accounts' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▼</span>
        </ClickableArea>
        <div style={{ padding: '8px' }}>💰 ₺{totalBalance}</div>
      </div>

      {/* Genişleyen Alanlar */}
      {expandedSection && (
        <div style={{ marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
          <h5 style={{ margin: '0 0 12px 0', color: '#333' }}>
            {expandedSection === 'accounts' ? 'Hesap Detayları' : 'Kredi Kartı Detayları'}
          </h5>
          <div style={{ padding: '8px', background: '#fafafa', borderRadius: '6px', maxHeight: '200px', overflowY: 'auto' }}>
            {expandedSection === 'accounts' && bank.accounts && bank.accounts.map(account => (
              <AccountListItem
                key={account.id}
                account={account}
                onClick={() => onAccountClick(account, bank)}
              />
            ))}
            {expandedSection === 'cards' && creditCards && (
              <div>
                {creditCards.length > 0 ? (
                  // ul ve li kaldırıldı
                  creditCards.map(card => (
                    <CreditCardListItem
                      key={card.id}
                      creditCard={card}
                      onClick={() => onCreditCardClick(card)}
                    />
                  ))
                ) : (
                  <p>Bu bankaya ait kredi kartı bulunmamaktadır.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </StyledCard>
  );
};

export default BankCard;