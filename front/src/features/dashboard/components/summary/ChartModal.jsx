import React, { useState } from 'react';
import { Modal, Space, DatePicker, Radio } from 'antd';
import ExpenseChart from '../ExpenseChart';
import IncomeChart from '../IncomeChart';

export default function ChartModal({ isVisible, onClose, type }) {
  const [chartType, setChartType] = useState('pie'); // 'pie' | 'stacked' | 'line'
  const [viewMode, setViewMode] = useState('monthly'); // 'daily' | 'weekly' | 'monthly'
  const [selectedDate, setSelectedDate] = useState(new Date());

  const renderChart = () => {
    const chartProps = {
      viewMode,
      currentDate: selectedDate,
      chartType,
    };

    if (type === 'expense') return <ExpenseChart {...chartProps} />;
    if (type === 'income') return <IncomeChart {...chartProps} />;
    return null;
  };

  return (
    <Modal
      title={type === 'expense' ? 'Gider Grafikleri' : 'Gelir Grafikleri'}
      open={isVisible}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      centered
      width={900}
    >
      <div style={{ marginBottom: 16 }}>
        <Space wrap>
          <Radio.Group
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="pie">Bütçe Kalemi Dağılımı</Radio.Button>
            <Radio.Button value="stacked">Tarihsel Dağılım</Radio.Button>
            <Radio.Button value="line">Gelir Gider Grafiği</Radio.Button>
          </Radio.Group>

          <Radio.Group
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
          >
            <Radio.Button value="daily">Günlük</Radio.Button>
            <Radio.Button value="weekly">Haftalık</Radio.Button>
            <Radio.Button value="monthly">Aylık</Radio.Button>
          </Radio.Group>

          <DatePicker
            picker={viewMode === 'monthly' ? 'month' : 'date'}
            onChange={(date) => setSelectedDate(date?.toDate() || new Date())}
            allowClear={false}
            value={selectedDate ? null : undefined}
          />
        </Space>
      </div>
      {renderChart()}
    </Modal>
  );
}
