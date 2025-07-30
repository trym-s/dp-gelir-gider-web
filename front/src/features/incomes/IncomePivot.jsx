import { useState, useMemo, useLayoutEffect, useRef } from "react";
import { Table, DatePicker, Typography, Row, Col, Spin, Alert, Input, Button, Card, Statistic, Radio, Tooltip } from "antd";
import { DownloadOutlined, DollarCircleOutlined, LeftOutlined, RightOutlined, FilterOutlined } from '@ant-design/icons';
import './IncomePivot.css';
import dayjs from "dayjs";
import "dayjs/locale/tr";
import { useIncomePivot } from "../../hooks/useIncomePivot";

dayjs.locale("tr");
const { Title, Text } = Typography;
const { Search } = Input;

// Helper functions (unchanged)
const getHeatmapColor = (value, max) => {
  if (value === 0 || max === 0) return 'transparent';
  const intensity = Math.min(value / max, 1.0);
  const hue = 120;
  const saturation = 100;
  const lightness = 95 - (intensity * 40);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

const exportToCSV = (columns, data) => {
  const headers = columns.map(c => c.title).join(',');
  const rows = data.flatMap(parent => 
    parent.children.map(child => 
      columns.map(c => {
        if (c.key === 'budget_item_name') return parent.budget_item_name;
        return child[c.dataIndex] || '';
      }).join(',')
    )
  ).join('\n');
  const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "gelir_raporu.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function GelirRaporu() {
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [searchText, setSearchText] = useState('');
  const [viewMode, setViewMode] = useState('monthly');
  const [currentWeek, setCurrentWeek] = useState(1);
  const [tableHeight, setTableHeight] = useState(0);
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);
  const { data, isLoading, error } = useIncomePivot(selectedDate);

  const headerRef = useRef(null);
  const kpiRef = useRef(null);
  const tableHeaderRef = useRef(null);
  const toolbarRef = useRef(null);

  useLayoutEffect(() => {
    const calculateHeight = () => {
      const headerHeight = headerRef.current?.offsetHeight || 0;
      const kpiHeight = kpiRef.current?.offsetHeight || 0;
      const tableHeaderHeight = tableHeaderRef.current?.offsetHeight || 0;
      const toolbarHeight = toolbarRef.current?.offsetHeight || 0;
      const extraPadding = 60; // Margins, etc.
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
      if (newWeek > 0 && newWeek <= weeksInMonth) {
        return newWeek;
      }
      return prev;
    });
  };

  const { filteredData, kpiData, maxDailyValue } = useMemo(() => {
    if (!data || data.length === 0) {
      return { filteredData: [], kpiData: { total: 0 }, maxDailyValue: 0 };
    }

    let maxVal = 0;
    data.forEach(parent => {
      for (let i = 1; i <= daysInMonth; i++) {
        if (parent[i] > maxVal) maxVal = parent[i];
      }
    });

    const monthlyTotal = data.reduce((sum, item) => sum + item.toplam, 0);
    const kpis = { total: monthlyTotal };

    let viewFilteredData = data;

    if (viewMode === 'weekly') {
      const startDay = (currentWeek - 1) * 7 + 1;
      const endDay = Math.min(currentWeek * 7, daysInMonth);

      viewFilteredData = data.map(parent => {
        let weeklyTotal = 0;
        for (let i = startDay; i <= endDay; i++) {
          weeklyTotal += parent[i] || 0;
        }

        if (weeklyTotal > 0) {
          return { ...parent, toplam: weeklyTotal };
        }
        return null;
      }).filter(Boolean);
    }

    if (!searchText) {
      return { filteredData: viewFilteredData, kpiData: kpis, maxDailyValue: maxVal };
    }

    const lowercasedFilter = searchText.toLowerCase();
    const searchedData = viewFilteredData.map(parent => {
      const hasChildren = parent.children && parent.children.length > 0;
      if (!hasChildren) {
        return parent.budget_item_name.toLowerCase().includes(lowercasedFilter) ? parent : null;
      }
      
      const filteredChildren = parent.children.filter(child =>
        child.firma.toLowerCase().includes(lowercasedFilter) ||
        child.description.toLowerCase().includes(lowercasedFilter)
      );

      if (parent.budget_item_name.toLowerCase().includes(lowercasedFilter) || filteredChildren.length > 0) {
        return { ...parent, children: filteredChildren.length > 0 ? filteredChildren : parent.children };
      }
      return null;
    }).filter(Boolean);

    return { filteredData: searchedData, kpiData: kpis, maxDailyValue: maxVal };
  }, [data, searchText, daysInMonth, viewMode, currentWeek]);

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
          backgroundColor: getHeatmapColor(record[day], maxDailyValue),
        },
      }),
      render: (val) => (val > 0 ? val.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) : "-"),
    }));
  }, [viewMode, currentWeek, daysInMonth, maxDailyValue]);

  const columns = [
    {
      title: "Bütçe Kalemi",
      dataIndex: "budget_item_name",
      key: "budget_item_name",
      width: 220,
      fixed: 'left',
      className: 'description-cell',
      render: (text, record) => record.children ? <strong>{text}</strong> : null,
    },
    {
      title: "Firma",
      dataIndex: "firma",
      key: "firma",
      width: 180,
      fixed: 'left',
      className: 'description-cell',
    },
    {
      title: "Açıklama",
      dataIndex: "description",
      key: "description",
      width: 250,
      className: 'description-cell',
    },
    ...dayColumns,
    {
      title: "Toplam",
      dataIndex: "toplam",
      key: "toplam",
      width: 130,
      fixed: 'right',
      align: "right",
      render: (val) => <strong>{val > 0 ? val.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) : "-"}</strong>,
      onCell: (record) => ({
        className: record.children ? 'total-cell' : '',
      }),
    },
  ];

  return (
    <div className="gelir-raporu-container">
      <div ref={headerRef}>
        <Title level={2} style={{ margin: 0, marginBottom: 'var(--spacing-xl)' }}>Gelir Raporlama</Title>
      </div>

      <div ref={kpiRef}>
        <Row gutter={[24, 24]} style={{ marginBottom: 'var(--spacing-xl)' }}>
          <Col xs={24}><Card><Statistic title="Aylık Toplam Gelir" value={kpiData.total} prefix={<DollarCircleOutlined />} precision={2} /></Card></Col>
        </Row>
      </div>
      
      <div ref={tableHeaderRef} style={{ marginBottom: 'var(--spacing-md)' }}>
        <Row justify="space-between" align="center">
          <Title level={4} style={{ margin: 0 }}>
            {selectedDate.format('MMMM YYYY')} Raporu
          </Title>
          <Tooltip title="Filtre ve Seçenekler" placement="bottom">
            <Button 
              icon={<FilterOutlined />} 
              type={isToolbarVisible ? 'primary' : 'default'}
              onClick={() => setIsToolbarVisible(!isToolbarVisible)} 
            />
          </Tooltip>
        </Row>
      </div>

      {isToolbarVisible && (
        <div ref={toolbarRef} className="toolbar" style={{ marginBottom: 'var(--spacing-md)' }}>
          <Search
            placeholder="Firma veya açıklamada ara..."
            onSearch={setSearchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
          <Row align="middle" style={{ gap: 'var(--spacing-md)' }}>
            <Radio.Group value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
              <Radio.Button value="monthly">Aylık</Radio.Button>
              <Radio.Button value="weekly">Haftalık</Radio.Button>
            </Radio.Group>
            
            {viewMode === 'weekly' ? (
              <Row align="middle" style={{ gap: 'var(--spacing-sm)' }}>
                <Button icon={<LeftOutlined />} onClick={() => handleWeekChange(-1)} disabled={currentWeek === 1} />
                <Text>Hafta {currentWeek}</Text>
                <Button icon={<RightOutlined />} onClick={() => handleWeekChange(1)} disabled={currentWeek === weeksInMonth} />
              </Row>
            ) : (
              <DatePicker
                picker="month"
                value={selectedDate}
                onChange={(date) => {
                  setSelectedDate(date);
                  setCurrentWeek(1);
                }}
                allowClear={false}
              />
            )}
            <Button icon={<DownloadOutlined />} onClick={() => exportToCSV(columns, filteredData)}>
              CSV İndir
            </Button>
          </Row>
        </div>
      )}

      <Spin spinning={isLoading} tip="Yükleniyor..." size="large">
        {error ? (
          <Alert message="Hata" description="Veriler yüklenirken bir sorun oluştu." type="error" showIcon />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredData}
            pagination={false}
            expandable={{ defaultExpandAllRows: false, expandRowByClick: true }}
            scroll={{ x: 'max-content', y: tableHeight }}
            rowClassName={(record) => (record.children ? 'table-group-header' : '')}
            bordered
            size="small"
          />
        )}
      </Spin>
    </div>
  );
}