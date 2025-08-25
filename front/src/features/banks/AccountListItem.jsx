import React from 'react';
import { Typography } from 'antd';
import styled, { css } from 'styled-components';
import { BankOutlined, CreditCardOutlined } from '@ant-design/icons';

const { Text } = Typography;

const AccountWrapper = styled.div`
  padding: 12px 16px;
  background-color: #ffffff;
  border-radius: 8px;
  margin-bottom: 8px;
  transition: all 0.3s ease;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #f0f0f0;

  ${({ disableHover }) => !disableHover && css`
    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      transform: translateY(-2px);
      border-color: #d9d9d9;
    }
  `}

  &:last-child {
    margin-bottom: 0;
  }

  ${({ isSelected }) =>
    isSelected &&
    css`
      border-color: #1890ff;
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
      background-color: #e6f7ff;
    `}
`;

const AccountInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex-grow: 1;
  overflow: hidden; /* Ensure text-overflow works */
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
  flex-shrink: 0;
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

const IbanText = styled(Text)`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px; /* Adjust as needed */
  display: block;
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
        <IbanText type="secondary">
          {account?.iban_number || account?.account_no || 'IBAN/Hesap No Yok'}
        </IbanText>
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