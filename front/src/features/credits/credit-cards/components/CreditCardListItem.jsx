// features/credits/credit-cards/components/CreditCardListItem.jsx
import React from 'react';
import { Typography } from 'antd';
import styled from 'styled-components';
import { CreditCardOutlined, DollarOutlined, TagOutlined } from '@ant-design/icons';

const { Text } = Typography;

const CreditCardWrapper = styled.div`
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

const CardInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex-grow: 1;
`;

const IconWrapper = styled.div`
  margin-right: 12px;
  font-size: 1.2em;
  color: #eb2f96; // Kredi kartlarına özel bir renk
`;

const DetailText = styled(Text)`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85em;
  color: #666;
`;

const AmountText = styled(Text)`
  font-size: 0.95em;
  font-weight: 500;
  color: ${props => (props.isDebt ? '#f5222d' : '#389e0d')}; // Borç kırmızı, limit yeşil
`;

const CreditCardListItem = ({ creditCard, onClick }) => {
  const creditLimit = parseFloat(creditCard.credit_limit);
  const currentDebt = parseFloat(creditCard.current_debt);

  const safeCreditLimit = isNaN(creditLimit) ? 0 : creditLimit;
  const safeCurrentDebt = isNaN(currentDebt) ? 0 : currentDebt;

  const availableLimit = safeCreditLimit - safeCurrentDebt;
  const usagePercentage = safeCreditLimit > 0 ? (safeCurrentDebt / safeCreditLimit) * 100 : 0;

  return (
    <CreditCardWrapper onClick={onClick}>
      <IconWrapper>
        <CreditCardOutlined />
      </IconWrapper>
      <CardInfo>
        <Text strong>{creditCard.name}</Text>
        <DetailText>
          <TagOutlined /> Limit: {creditCard.limit} {creditCard.currency || '₺'}
        </DetailText>
        <DetailText>
          <DollarOutlined /> Borç: <AmountText isDebt>{creditCard.current_debt} {creditCard.currency || '₺'}</AmountText>
        </DetailText>
      </CardInfo>
    </CreditCardWrapper>
  );
};

export default CreditCardListItem;