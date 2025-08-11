import React from 'react';
import { Tabs, Typography } from 'antd';
import BanksTab from './BanksTab';
import BankAccountsTab from './BankAccountsTab';
import CustomerTab from './CustomerTab';
import LoansTab from './LoansTab';
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
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: '24px' }}>Yönetim Paneli</Title>
      <Tabs defaultActiveKey="1" items={items} />
    </div>
  );
};

export default ManagementPage;
