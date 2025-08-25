import React from 'react';
import { Typography, Progress, Tag, Spin } from 'antd';
import styled, { css } from 'styled-components';
import { PercentageOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getPaymentsForLoan } from '../../../../api/loanService';

const { Text } = Typography;

const LoanWrapper = styled.div`
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
      border-color: #9254de;
      box-shadow: 0 0 0 2px rgba(146, 84, 222, 0.2);
      background-color: #f6f2ff;
    `}
`;

const LoanInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex-grow: 1;
  margin-left: 12px;
`;

const IconWrapper = styled.div`
  font-size: 1.2em;
  color: #9254de;
`;

const AmountContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 120px;
`;

const AmountText = styled(Text)`
  font-size: 0.95em;
  font-weight: 500;
`;

const StatsContainer = styled.div`
    display: flex;
    gap: 8px;
    margin-top: 4px;
`;

const currencyLabel = (code) => code || '₺';

const PaidInstallmentsTag = ({ loanId }) => {
  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ['loanPayments', loanId],
    queryFn: () => getPaymentsForLoan(loanId),
    enabled: !!loanId,
    select: (response) => response.data.data,
  });

  if (isLoading) {
    return <Spin size="small" />;
  }

  const paidCount = paymentsData?.length || 0;

  return (
    <Tag color="blue">{paidCount} Taksit Ödendi</Tag>
  );
};

const LoanListItem = ({ loan, onClick, isSelected, disableHover = false }) => {
  const totalAmount = parseFloat(loan?.amount_drawn) || 0;
  const remainingAmount = parseFloat(loan?.remaining_principal) || 0;
  const paidAmount = totalAmount - remainingAmount;
  const progress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  return (
    <LoanWrapper onClick={onClick} isSelected={isSelected} disableHover={disableHover}>
      <IconWrapper>
        <PercentageOutlined />
      </IconWrapper>

      <LoanInfo>
        <Text strong>{loan?.name || '—'}</Text>
        <Progress percent={progress} showInfo={false} strokeColor="#9254de" size="small" />
        <StatsContainer>
            <PaidInstallmentsTag loanId={loan.id} />
            <Tag icon={<PercentageOutlined />} color="purple">{(loan.monthly_interest_rate * 100).toFixed(2)}%</Tag>
        </StatsContainer>
      </LoanInfo>

      <AmountContainer>
        <AmountText style={{ color: '#8c8c8c' }}>
          Kalan: {remainingAmount.toFixed(2)} {currencyLabel(loan?.currency)}
        </AmountText>
        <AmountText style={{ fontSize: '0.8em', color: '#bfbfbf' }}>
          Toplam: {totalAmount.toFixed(2)} {currencyLabel(loan?.currency)}
        </AmountText>
      </AmountContainer>
    </LoanWrapper>
  );
};

export default LoanListItem;
