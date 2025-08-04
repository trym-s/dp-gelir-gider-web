// src/features/banks/charts/BankChartsContainer.jsx
import React from 'react';
import { Card, Tabs } from 'antd';
import DailyRiskChart from './DailyRiskChart';
import DailyCreditLimitChart from './DailyCreditLimitChart';
import { LineChartOutlined, CreditCardOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;

const BankChartsContainer = ({ bank_id }) => {
  return (
    <Card title="Günlük Finansal Analizler" style={{ width: '100%' }}>
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
          <DailyRiskChart bank_id={bank_id} />
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
          <DailyCreditLimitChart bank_id={bank_id} />
        </TabPane>
      </Tabs>
    </Card>
  );
};

export default BankChartsContainer;
