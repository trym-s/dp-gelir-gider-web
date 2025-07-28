import React, { useState } from 'react';
import { Card, Typography, Button } from 'antd';
import AccountListItem from './AccountListItem';
import styled from 'styled-components';

const { Title } = Typography;

const StyledCard = styled(Card)`
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.07);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  }

  .ant-card-body {
    padding: 0;
  }

  .logo-container {
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #fbfcfdff;
    border-radius: 12px;
    margin-right: 1px;
    padding: 5px;
  }

  .bank-dashboard-logo {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 10px;
  cursor: pointer;
`;

const BankCard = ({ bank, onBankClick, onAccountClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const visibleAccounts = isExpanded ? bank.accounts : bank.accounts.slice(0, 2);

  return (
    <StyledCard>
      <CardHeader onClick={() => onBankClick(bank)}>
        <div className="logo-container">
          <img 
            src={bank.logo_url || '/path/to/default/logo.png'} 
            alt={`${bank.name} logo`} 
            className="bank-dashboard-logo" 
          />
        </div>
        <Title level={4} style={{ margin: 0, flex: 1 }}>{bank.name}</Title>
      </CardHeader>
      <div>
        {visibleAccounts.map(account => (
          <AccountListItem 
            key={account.id} 
            account={account} 
            onClick={() => onAccountClick(account, bank)} 
          />
        ))}
      </div>
      {bank.accounts.length > 2 && (
        <div style={{ padding: '0 20px 20px', textAlign: 'center' }}>
          <Button type="link" onClick={toggleExpand}>
            {isExpanded ? 'Gizle' : `Diğer ${bank.accounts.length - 2} hesabı göster`}
          </Button>
        </div>
      )}
    </StyledCard>
  );
};

export default BankCard;
