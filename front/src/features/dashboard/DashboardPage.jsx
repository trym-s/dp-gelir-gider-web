import React from 'react';
import { Row, Col } from 'antd';
import SummaryCharts from "./summary/SummaryCharts";
import ActivityLog from "./activity-log/ActivityLog";
import './styles/DashboardPage.css';

export default function DashboardPage() {
  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} xl={18}>
        <SummaryCharts />
      </Col>
      <Col xs={24} xl={6}>
        <ActivityLog />
      </Col>
    </Row>
  );
}
