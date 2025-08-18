import React from 'react';
import { Typography } from 'antd';
import styled, { css } from 'styled-components';
import { BankOutlined, CreditCardOutlined } from '@ant-design/icons';

const { Text } = Typography;

const AccountWrapper = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.3s ease, transform 0.2s ease, border-left 0.3s ease;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-left: 5px solid transparent;

  ${({ disableHover }) => !disableHover && css`
    &:hover {
      background-color: #e6f7ff;
      transform: translateX(5px);
    }
  `}

  &:last-child {
    border-bottom: none;
  }

  ${({ isSelected }) =>
    isSelected &&
    css`
      background-color: #e6f7ff !important;
      border-left: 5px solid #1890ff;
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
  color: #1890ff;
`;

const BalanceContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
`;

const BalanceText = styled(Text)`
  font-size: 0.95em;
  color: #52c41a;
  font-weight: 500;
`;

const KmhLimitText = styled(Text)`
  font-size: 0.8em;
  color: #faad14;
`;

/* ---- helpers ---- */
const toNum = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const currencyLabel = (code) => code || '₺';

const AccountListItem = ({ account, onSelect, isSelected, disableHover = false }) => {
  const isCreditCardAccount = account?.type === 'creditCard';
  const IconComponent = isCreditCardAccount ? CreditCardOutlined : BankOutlined;

  const balanceNum = toNum(account?.balance);
  const kmhNum = toNum(account?.kmh_limit);

  return (
    <AccountWrapper onClick={onSelect} isSelected={isSelected} disableHover={disableHover}>
      <IconWrapper>
        <IconComponent />
      </IconWrapper>

      <AccountInfo>
        <Text strong>{account?.name || '—'}</Text>
        <Text type="secondary" style={{ display: 'block' }}>
          {account?.iban_number || account?.account_no || 'IBAN/Hesap No Yok'}
        </Text>
      </AccountInfo>

      <BalanceContainer>
        {balanceNum !== null && (
          <BalanceText>
            {balanceNum.toFixed(2)} {currencyLabel(account?.currency)}
          </BalanceText>
        )}

        {kmhNum !== null && kmhNum > 0 && (
          <KmhLimitText>
            KMH Limiti: {kmhNum.toFixed(2)} {currencyLabel(account?.currency)}
          </KmhLimitText>
        )}
      </BalanceContainer>
    </AccountWrapper>
  );
};

export default AccountListItem;

