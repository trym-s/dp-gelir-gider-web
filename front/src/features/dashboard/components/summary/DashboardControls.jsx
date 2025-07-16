import React from 'react';
import { Button, Select, Typography } from 'antd';
import { 
  LeftOutlined, 
  RightOutlined,
  CalendarOutlined,
  AppstoreOutlined,
  ContainerOutlined 
} from '@ant-design/icons';

const { Title } = Typography;
const { Option } = Select;

const viewOptions = [
  { value: 'daily', label: 'Günlük', icon: <CalendarOutlined /> },
  { value: 'weekly', label: 'Haftalık', icon: <AppstoreOutlined /> },
  { value: 'monthly', label: 'Aylık', icon: <ContainerOutlined /> }
];

const DashboardControls = ({ currentDate, viewMode, loading, onDateChange, onViewModeChange }) => {
  
  const handlePrev = () => onDateChange('previous');
  const handleNext = () => onDateChange('next');

  const formatDisplayDate = (date) => {
    if (viewMode === 'monthly') {
      return new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(date);
    }
    if (viewMode === 'weekly') {
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1)); // Haftayı Pazartesi başlat
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const startDay = startOfWeek.getDate();
      const endDay = endOfWeek.getDate();
      const startMonthName = new Intl.DateTimeFormat('tr-TR', { month: 'long' }).format(startOfWeek);
      
      if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        return `${startDay}-${endDay} ${startMonthName}`;
      } else {
        const endMonthName = new Intl.DateTimeFormat('tr-TR', { month: 'long' }).format(endOfWeek);
        return `${startDay} ${startMonthName} - ${endDay} ${endMonthName}`;
      }
    }
    return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
  };

  return (
    <div className="summary-controls-container">
      <div className="controls-header">
        <div className="date-navigator">
          <Button icon={<LeftOutlined />} onClick={handlePrev} disabled={loading} />
          <Title level={5} style={{ margin: '0 10px', whiteSpace: 'nowrap' }} className="date-display">
            {formatDisplayDate(currentDate)}
          </Title>
          <Button icon={<RightOutlined />} onClick={handleNext} disabled={loading} />
        </div>
        <Select
          value={viewMode}
          onChange={onViewModeChange}
          disabled={loading}
          style={{ width: 140 }}
        >
          {viewOptions.map(opt => (
            <Option key={opt.value} value={opt.value}>
              <span style={{ marginRight: '8px' }}>
                {opt.icon}
              </span>
              {opt.label}
            </Option>
          ))}
        </Select>
      </div>
    </div>
  );
};

export default DashboardControls;

