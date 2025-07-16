import React from 'react';
import { Button, Segmented, Typography } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

const { Title } = Typography;

const DashboardControls = ({ currentDate, viewMode, loading, onDateChange, onViewModeChange }) => {
  
  const handlePrev = () => onDateChange('previous');
  const handleNext = () => onDateChange('next');

  const formatDisplayDate = (date) => {
    if (viewMode === 'monthly') {
      return new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(date);
    }
    return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
  };

  return (
    <div className="summary-controls-container">
      <div className="controls-header">
        <div className="date-navigator">
          <Button icon={<LeftOutlined />} onClick={handlePrev} disabled={loading} />
          <Title level={5} style={{ margin: 0 }} className="date-display">
            {formatDisplayDate(currentDate)}
          </Title>
          <Button icon={<RightOutlined />} onClick={handleNext} disabled={loading} />
        </div>
        <Segmented
          options={[{ label: 'Günlük', value: 'daily' }, { label: 'Aylık', value: 'monthly' }]}
          value={viewMode}
          onChange={onViewModeChange}
          disabled={loading}
        />
      </div>
    </div>
  );
};

export default DashboardControls;
