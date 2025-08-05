import React from 'react';
import { Typography } from 'antd';
import styled, { css } from 'styled-components';
import { BankOutlined, CreditCardOutlined } from '@ant-design/icons'; // Yeni ikonlar

const { Text } = Typography;

const AccountWrapper = styled.div`
  padding: 12px 16px; // Daha küçük iç boşluk
  border-bottom: 1px solid #f0f0f0; // Alt çizgi
  transition: background-color 0.3s ease, transform 0.2s ease, border-left 0.3s ease; // Animasyonlar eklendi
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between; // İçerikleri yay
  border-left: 5px solid transparent; // For selection indicator

  &:hover {
    background-color: #e6f7ff; // Hafif mavi hover
    transform: translateX(5px); // Hafif sağa kaydırma
  }
  &:last-child {
    border-bottom: none; // Son öğede alt çizgi olmasın
  }

  ${({ isSelected }) =>
    isSelected &&
    css`
      background-color: #e6f7ff !important; // Light blue for selected
      border-left: 5px solid #1890ff; // Primary blue indicator
      transform: translateX(5px);
    `}
`;

const AccountInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex-grow: 1;
`;

const IconWrapper = styled.div`
  margin-right: 12px;
  font-size: 1.2em;
  color: #1890ff; // Ant Design primary-blue
`;

const BalanceText = styled(Text)`
  font-size: 0.95em;
  color: #52c41a; // Yeşil renk
  font-weight: 500;
`;

const AccountListItem = ({ account, onSelect, isSelected }) => {
  const isCreditCardAccount = account.type === 'creditCard'; // Assuming a 'type' field
  const IconComponent = isCreditCardAccount ? CreditCardOutlined : BankOutlined;

  return (
    <AccountWrapper onClick={onSelect} isSelected={isSelected}>
      <IconWrapper>
        <IconComponent />
      </IconWrapper>
      <AccountInfo>
        <Text strong>{account.name}</Text>
        <Text type="secondary" style={{ display: 'block' }}>
          {account.iban_number || account.account_no || 'IBAN/Hesap No Yok'}
        </Text>
      </AccountInfo>
      {typeof account.balance === 'number' && (
        <BalanceText>
          {account.balance.toFixed(2)} {account.currency || '₺'}
        </BalanceText>
      )}
    </AccountWrapper>
  );
};

export default AccountListItem;