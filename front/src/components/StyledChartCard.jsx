import { Card } from 'antd';
import styled from 'styled-components';

const StyledChartCard = styled(Card)`
  text-align: center;
  background-color: #f8f9fa;
  border-radius: 2px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  padding: 1px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  .ant-card-head {
    font-size: 0.9em;
    min-height: auto;
    padding-bottom: 8px;
  }
  .ant-card-body {
    padding: 12px !important;
  }
  .ant-statistic-title {
    font-size: 0.9em;
    margin-bottom: 4px;
  }
  .ant-statistic-content {
    font-size: 1.2em;
    font-weight: bold;
  }
  .ant-statistic-content-suffix {
    font-size: 0.8em;
  }
`;

export default StyledChartCard;