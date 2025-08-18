
import React from 'react';
import { Button, Select, Typography, Tooltip, Spin } from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  CalendarOutlined,
  AppstoreOutlined,
  ContainerOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

const viewOptions = [
  { value: 'daily', label: 'Günlük', icon: <CalendarOutlined /> },
  { value: 'weekly', label: 'Haftalık', icon: <AppstoreOutlined /> },
  { value: 'monthly', label: 'Aylık', icon: <ContainerOutlined /> }
];

const currencyOptions = ['TRY', 'USD', 'EUR', 'GBP', 'AED'];

const DashboardControls = ({
  currentDate,
  viewMode,
  loading,
  onDateChange,
  onViewModeChange,
  skippedDays = 0,
  navLoading = false,
  currency = 'TRY',
  onCurrencyChange = () => {}
}) => {
  const handlePrev = () => onDateChange('previous');
  const handleNext = () => onDateChange('next');

  const formatDisplayDate = (date) => {
    if (viewMode === 'monthly') {
      return new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(date);
    }
    if (viewMode === 'weekly') {
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1));
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

  const controlsDisabled = loading || navLoading;

  return (
    <div className="summary-controls-container">
      <div className="controls-header" style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
        <div className="date-navigator" style={{ display: 'flex', alignItems: 'center' }}>
          <Button icon={<LeftOutlined />} onClick={handlePrev} disabled={controlsDisabled} />
          <Title
            level={5}
            style={{ margin: '0 10px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}
            className="date-display"
          >
            {formatDisplayDate(currentDate)}
            {viewMode === 'daily' && navLoading && <Spin size="small" />}
          </Title>
          <Button icon={<RightOutlined />} onClick={handleNext} disabled={controlsDisabled} />
        </div>

        {viewMode === 'daily' && skippedDays > 0 && (
          <Tooltip title="Veri olmayan günler otomatik atlanır.">
            <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
              ({skippedDays} boş gün atlandı)
            </Text>
          </Tooltip>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Select
            value={viewMode}
            onChange={onViewModeChange}
            disabled={controlsDisabled}
            style={{ width: 140 }}
          >
            {viewOptions.map(opt => (
              <Option key={opt.value} value={opt.value}>
                <span style={{ marginRight: 8 }}>{opt.icon}</span>
                {opt.label}
              </Option>
            ))}
          </Select>

          {/* NEW: Currency selector */}
          <Select
            value={currency}
            onChange={onCurrencyChange}
            disabled={controlsDisabled}
            style={{ width: 110 }}
          >
            {currencyOptions.map(cur => (
              <Option key={cur} value={cur}>{cur}</Option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
};

export default DashboardControls;

