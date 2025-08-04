import React from 'react';
import { Typography } from 'antd';
import styled from 'styled-components';
import { BankOutlined, CreditCardOutlined } from '@ant-design/icons'; // Yeni ikonlar

const { Text } = Typography;

const AccountWrapper = styled.div`
  padding: 12px 16px; // Daha küçük iç boşluk
  border-bottom: 1px solid #f0f0f0; // Alt çizgi
  transition: background-color 0.3s ease, transform 0.2s ease; // Animasyonlar eklendi
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between; // İçerikleri yay
  &:hover {
    background-color: #e6f7ff; // Hafif mavi hover
    transform: translateX(5px); // Hafif sağa kaydırma
  }
  &:last-child {
    border-bottom: none; // Son öğede alt çizgi olmasın
  }
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

const AccountListItem = ({ account, onClick }) => {
  const isCreditCardAccount = account.type === 'creditCard'; // Assuming a 'type' field
  const IconComponent = isCreditCardAccount ? CreditCardOutlined : BankOutlined;

  return (
    <AccountWrapper onClick={onClick}>
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