import React, { useState } from 'react';
import { Card, Avatar, Typography, Button, Collapse } from 'antd';
import AccountListItem from './AccountListItem';
import styled from 'styled-components';

const { Title } = Typography;
const { Panel } = Collapse;

const StyledCard = styled(Card)`
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.07);
  transition: all 0.3s ease;
  height: 100%;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  }

  .ant-card-body {
    padding: 0;
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 20px;
  cursor: pointer;
`;

const BankCard = ({ bank }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = (e) => {
    // Prevent card click from triggering when clicking the button
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const visibleAccounts = isExpanded ? bank.accounts : bank.accounts.slice(0, 2);

  return (
    <StyledCard>
      <CardHeader>
        <Avatar src={bank.logo_url || '/path/to/default/logo.png'} size={48} style={{ marginRight: '16px' }} />
        <Title level={4} style={{ margin: 0, flex: 1 }}>{bank.name}</Title>
      </CardHeader>
      <div>
        {visibleAccounts.map(account => (
          <AccountListItem key={account.id} account={account} />
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
