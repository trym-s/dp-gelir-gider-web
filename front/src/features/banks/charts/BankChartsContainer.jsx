// src/features/banks/charts/BankChartsContainer.jsx
import React from 'react';
import { Tabs } from 'antd';
import DailyRiskChart from './DailyRiskChart';
import DailyCreditLimitChart from './DailyCreditLimitChart';
import StyledChartCard from '../../../components/StyledChartCard';
import { LineChartOutlined, CreditCardOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;

const BankChartsContainer = ({ bank_id, selectedAccountId }) => {
  return (
    <StyledChartCard>
      <Tabs defaultActiveKey="1" destroyInactiveTabPane>
        <TabPane
          tab={
            <span>
              <LineChartOutlined />
              KMH Risk
            </span>
          }
          key="1"
        >
          <DailyRiskChart bank_id={bank_id} selectedAccountId={selectedAccountId} />
        </TabPane>
        <TabPane
          tab={
            <span>
              <CreditCardOutlined />
              Kart Limit
            </span>
          }
          key="2"
        >
          <DailyCreditLimitChart bank_id={bank_id} selectedAccountId={selectedAccountId} />
        </TabPane>
      </Tabs>
    </StyledChartCard>
  );
};

export default BankChartsContainer;
