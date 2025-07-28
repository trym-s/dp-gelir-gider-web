import React from 'react';
import { Typography } from 'antd';
import styled from 'styled-components';

const { Text } = Typography;

const CreditCardWrapper = styled.div`
  padding: 12px 24px;
  border-top: 1px solid #f0f0f0;
  transition: background-color 0.3s ease;
  cursor: pointer;

  &:hover {
    background-color: #f7f7f7;
  }
`;

const CreditCardListItem = ({ creditCard, onClick }) => {
  return (
    <CreditCardWrapper onClick={onClick}>
      <Text strong>{creditCard.card_name}</Text>
      <Text type="secondary" style={{ display: 'block' }}>
        Limit: {creditCard.credit_limit} {creditCard.currency}
      </Text>
      <Text type="secondary" style={{ display: 'block' }}>
        Borç: {creditCard.current_debt} {creditCard.currency}
      </Text>
    </CreditCardWrapper>
  );
};

export default CreditCardListItem;
