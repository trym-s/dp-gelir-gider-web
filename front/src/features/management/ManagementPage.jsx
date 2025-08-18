import React from 'react';
import { Tabs, Typography } from 'antd';
import BanksTab from './BanksTab';
import BankAccountsTab from './BankAccountsTab';
import CustomerTab from './CustomerTab';
import LoansTab from './LoansTab';
import KMHTab from './KMHTab';
import LoanTypes from '../credits/loans/LoanTypes';
const { Title } = Typography;

const ManagementPage = () => {
  const items = [
    {
      key: '1',
      label: `Bankalar`,
      children: <BanksTab />,
    },
    {
      key: '2',
      label: `Banka Hesapları`,
      children: <BankAccountsTab />,
    },
    {
      key: '3',
      label: `Müşteriler`,
      children: <CustomerTab />,
    },
    {
      key: '4',
      label: `Krediler`,
      children: <LoansTab />,
    },
    { key: '5', label: 'KMH Hesapları', children: <KMHTab /> },
    { key: '6', label: 'Kredi Türleri', children: <LoanTypes /> },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: '24px' }}>Yönetim Paneli</Title>
      <Tabs defaultActiveKey="1" items={items} />
    </div>
  );
};

export default ManagementPage;
