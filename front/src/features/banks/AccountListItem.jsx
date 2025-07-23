import React from 'react';
import { Typography } from 'antd';
import styled from 'styled-components';

const { Text } = Typography;

const AccountWrapper = styled.div`
  padding: 12px 24px;
  border-top: 1px solid #f0f0f0;
  transition: background-color 0.3s ease;
  cursor: pointer;

  &:hover {
    background-color: #f7f7f7;
  }
`;

const AccountListItem = ({ account }) => {
  return (
    <AccountWrapper>
      <Text strong>{account.name}</Text>
      <Text type="secondary" style={{ display: 'block' }}>{account.iban}</Text>
    </AccountWrapper>
  );
};

export default AccountListItem;
