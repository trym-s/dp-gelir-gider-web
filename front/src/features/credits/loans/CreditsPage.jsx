import React from 'react';
import { Tabs } from 'antd';
import BankLoans from './BankLoans';
import LoanTypes from './LoanTypes'; // Bu dosyayı birazdan oluşturacağız
import './BankLoans.css';

const { TabPane } = Tabs;

const CreditsPage = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Tabs defaultActiveKey="1">
        <TabPane tab="Kredilerim" key="1">
          <BankLoans />
        </TabPane>
        <TabPane tab="Kredi Türleri" key="2">
          <LoanTypes />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default CreditsPage;