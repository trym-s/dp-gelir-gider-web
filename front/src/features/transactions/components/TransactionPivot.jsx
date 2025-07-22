import { useState, useMemo, useLayoutEffect, useRef } from "react";
import { Table, DatePicker, Typography, Row, Col, Spin, Alert, Input, Button, Card, Statistic, Radio, Tooltip } from "antd";
import { DownloadOutlined, DollarCircleOutlined, LeftOutlined, RightOutlined, FilterOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import dayjs from "dayjs";
import "dayjs/locale/tr";
import { useTransactionPivot } from "../hooks/useTransactionPivot";
import '../../incomes/IncomePivot.css'; // Reusing styles for now

dayjs.locale("tr");
const { Title, Text } = Typography;
const { Search } = Input;

const getHeatmapColor = (value, max, colorConfig) => {
  if (value === 0 || max === 0) return 'transparent';
  const intensity = Math.min(value / max, 1.0);
  const lightness = 95 - (intensity * 40);
  return `hsl(${colorConfig.hue}, ${colorConfig.saturation}%, ${lightness}%)`;
};

export default function TransactionPivot({ config }) {
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [searchText, setSearchText] = useState('');
  const [viewMode, setViewMode] = useState('monthly');
  const [currentWeek, setCurrentWeek] = useState(1);
  const [tableHeight, setTableHeight] = useState(0);
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState([]);
  const { data, isLoading, error } = useTransactionPivot(selectedDate, config);

  const headerRef = useRef(null);
  const kpiRef = useRef(null);
  const tableHeaderRef = useRef(null);
  const toolbarRef = useRef(null);

  useLayoutEffect(() => {
    const calculateHeight = () => {
      const headerHeight = headerRef.current?.offsetHeight || 0;
      const kpiHeight = kpiRef.current?.offsetHeight || 0;
      const tableHeaderHeight = tableHeaderRef.current?.offsetHeight || 0;
      const toolbarHeight = isToolbarVisible ? (toolbarRef.current?.offsetHeight || 0) : 0;
      const extraPadding = 60;
      const totalOffset = headerHeight + kpiHeight + tableHeaderHeight + toolbarHeight + extraPadding;
      const newHeight = window.innerHeight - totalOffset;
      setTableHeight(newHeight > 200 ? newHeight : 200);
    };
    calculateHeight();
    window.addEventListener('resize', calculateHeight);
    return () => window.removeEventListener('resize', calculateHeight);
  }, [isLoading, isToolbarVisible]);

  const daysInMonth = selectedDate.daysInMonth();
  const weeksInMonth = Math.ceil(daysInMonth / 7);

  const handleWeekChange = (direction) => {
    setCurrentWeek(prev => {
      const newWeek = prev + direction;
      if (newWeek > 0 && newWeek <= weeksInMonth) return newWeek;
      return prev;
    });
  };

  const { filteredData, kpiData, maxDailyValue } = useMemo(() => {
    if (!data || data.length === 0) {
      return { filteredData: [], kpiData: { total: 0 }, maxDailyValue: 0 };
    }
    let maxVal = 0;
    data.forEach(p => p.children.forEach(c => {
        for(let i=1; i<=daysInMonth; i++) {
            if(c[i] > maxVal) maxVal = c[i];
        }
    }));

    const total = data.reduce((sum, p) => sum + (p.toplam || 0), 0);
    return { filteredData: data, kpiData: { total }, maxDailyValue: maxVal };
  }, [data, daysInMonth]);

  const allGroupKeys = useMemo(() => data.map(item => item.key), [data]);

  const dayColumns = useMemo(() => {
    const startDay = (currentWeek - 1) * 7 + 1;
    const endDay = Math.min(currentWeek * 7, daysInMonth);
    const daysToShow = viewMode === 'weekly' ? Array.from({ length: endDay - startDay + 1 }, (_, i) => startDay + i) : Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return daysToShow.map(day => ({
      title: day.toString(),
      dataIndex: day,
      key: day,
      width: 75,
      align: "right",
      onCell: (record) => ({
        style: {
          backgroundColor: record.__summary ? "#f0f5ff" : getHeatmapColor(record[day], maxDailyValue, config.pivot.heatmapColor),
          fontWeight: record.__summary ? "bold" : "normal"
        }
      }),
      render: (val) => val > 0 ? val.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) : ""
    }));
  }, [viewMode, currentWeek, daysInMonth, maxDailyValue, config.pivot.heatmapColor]);

  const columns = [
    { title: "Bütçe Kalemi", dataIndex: "budget_item_name", key: "budget_item_name", width: 220, fixed: 'left', render: (text, record) => record.children ? <strong>{text}</strong> : null },
    ...config.pivot.columns.map(c => ({...c, fixed: 'left', render: (text, record) => record.__summary ? <strong>{text}</strong> : text})),
    { title: "Açıklama", dataIndex: "description", key: "description", width: 250 },
    ...dayColumns,
    { title: "Toplam", dataIndex: "toplam", key: "toplam", width: 130, fixed: 'right', align: "right", render: (val) => <strong>{val > 0 ? val.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) : "-"}</strong> },
  ];

  return (
    <div className="gider-raporu-container">
      <div ref={headerRef}><Title level={2} style={{ margin: 0, marginBottom: 'var(--spacing-xl)' }}>{config.title} Raporlama</Title></div>
      <div ref={kpiRef}>
        <Row gutter={[24, 24]} style={{ marginBottom: 'var(--spacing-xl)' }}>
          <Col xs={24}><Card><Statistic title={`Aylık Toplam ${config.title}`} value={kpiData.total} prefix={<DollarCircleOutlined />} precision={2} /></Card></Col>
        </Row>
      </div>
      <div ref={tableHeaderRef} style={{ marginBottom: 'var(--spacing-md)' }}>
        <Row justify="space-between" align="center">
            <Title level={4} style={{ margin: 0 }}>{selectedDate.format('MMMM YYYY')} Raporu</Title>
            <DatePicker picker="month" value={selectedDate} onChange={setSelectedDate} allowClear={false} />
        </Row>
      </div>
      <Spin spinning={isLoading} tip="Yükleniyor..." size="large">
        {error ? <Alert message="Hata" description="Veriler yüklenirken bir sorun oluştu." type="error" showIcon /> : (
          <Table
            columns={columns}
            dataSource={filteredData}
            pagination={false}
            expandable={{ expandedRowKeys: expandedKeys, onExpandedRowsChange: setExpandedKeys, defaultExpandAllRows: true }}
            scroll={{ x: 'max-content', y: tableHeight }}
            rowClassName={(record) => record.__summary ? "summary-row" : (record.children ? "table-group-header" : "")}
            bordered
            size="small"
          />
        )}
      </Spin>
    </div>
  );
}
