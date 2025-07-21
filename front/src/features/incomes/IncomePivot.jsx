import { useState, useMemo, useLayoutEffect, useRef } from "react";
import { Table, DatePicker, Typography, Row, Col, Spin, Alert, Input, Button, Card, Statistic, Radio, Tooltip } from "antd";
import { DownloadOutlined, DollarCircleOutlined, LeftOutlined, RightOutlined, FilterOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import './IncomePivot.css';
import dayjs from "dayjs";
import "dayjs/locale/tr";
import { useIncomePivot } from "../../hooks/useIncomePivot";

dayjs.locale("tr");
const { Title, Text } = Typography;
const { Search } = Input;

const getHeatmapColor = (value, max) => {
  if (value === 0 || max === 0) return 'transparent';
  const intensity = Math.min(value / max, 1.0);
  const hue = 120; // Green for incomes
  const saturation = 100;
  const lightness = 95 - (intensity * 40);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

const exportToCSV = (columns, data, fileName) => {
    const dayCols = columns.filter(c => c.key.toString().match(/^\d+$/));

    const headers = [
        "Bütçe Kalemi",
        "Konum",
        "Firma",
        "Açıklama",
        ...dayCols.map(c => c.title),
        "Toplam"
    ].join(',');

    const rows = data.flatMap(parent =>
        (parent.children || []).map(child => {
            const rowData = [
                parent.budget_item_name,
                child.region_name,
                child.company_name,
                child.description,
                ...dayCols.map(c => child[c.dataIndex] || '0'),
                child.toplam || '0'
            ];
            return rowData.map(value => `"${String(value || '').replace(/"/g, '""')}"`).join(',');
        })
    ).join('\n');

    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${fileName}.csv`);
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
  const [expandedKeys, setExpandedKeys] = useState([]);
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
      const toolbarHeight = isToolbarVisible ? (toolbarRef.current?.offsetHeight || 0) : 0;
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
    data.forEach((parent) => {
      for (let i = 1; i <= daysInMonth; i++) {
        if (parent[i] > maxVal) maxVal = parent[i];
      }
    });

    let viewFilteredData = data;

    if (viewMode === "weekly") {
      const startDay = (currentWeek - 1) * 7 + 1;
      const endDay = Math.min(currentWeek * 7, daysInMonth);

      viewFilteredData = data.map((parent) => {
        if (!parent.children) return null;

        const filteredChildren = parent.children
          .map((child) => {
            // Sadece bu haftada gelir varsa al
            const hasIncome = Array.from({ length: endDay - startDay + 1 }, (_, i) => startDay + i)
              .some((day) => child[day] && child[day] > 0);

            if (!hasIncome) return null;
            const childClone = { ...child, toplam: 0 };

            for (let i = 1; i <= daysInMonth; i++) {
              if (i >= startDay && i <= endDay) {
                childClone[i] = child[i] || 0;
                childClone.toplam += childClone[i];
              } else {
                delete childClone[i]; // diğer günleri tamamen kaldır
              }
            }

            return childClone;
          })
          .filter(Boolean);

        if (filteredChildren.length === 0) return null;

        return {
          ...parent,
          key: parent.budget_item_name,
          children: filteredChildren
        };
      }).filter(Boolean);
    }


    let weeklyTotal = 0;
    if (viewMode === "weekly") {
      for (const parent of viewFilteredData) {
        for (const child of parent.children || []) {
          weeklyTotal += child.toplam || 0;
        }
      }
    } else {
      for (const parent of data) {
        for (const child of parent.children || []) {
          weeklyTotal += child.toplam || 0;
        }
      }
    }

    const kpis = { total: weeklyTotal };


    const enhancedData = viewFilteredData.map((parent) => {
      if (!parent.children) return parent;

      const summaryRow = {
        key: `${parent.budget_item_name}_summary`,
        firma: "Ara Toplam",
        description: "",
        __summary: true,
        toplam: 0
      };

      const startDay = (currentWeek - 1) * 7 + 1;
      const endDay = Math.min(currentWeek * 7, daysInMonth);

      const dayRange = viewMode === "weekly"
        ? Array.from({ length: endDay - startDay + 1 }, (_, i) => startDay + i)
        : Array.from({ length: daysInMonth }, (_, i) => i + 1);

      for (const day of dayRange) {
        summaryRow[day] = parent.children.reduce((sum, child) => sum + (child[day] || 0), 0);
        summaryRow.toplam += summaryRow[day];
      }


      return {
        ...parent,
        key: parent.budget_item_name,
        children: [...parent.children, summaryRow]
      };
    });

    return { filteredData: enhancedData, kpiData: kpis, maxDailyValue: maxVal };
  }, [data, searchText, daysInMonth, viewMode, currentWeek]);

  const allGroupKeys = useMemo(() => {
    return filteredData.map((item) => item.key || item.budget_item_name);
  }, [filteredData]);

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
      render: (text, record) => record.children ? <Text strong>{text}</Text> : null,
    },
    {
      title: "Firma",
      dataIndex: "firma",
      key: "firma",
      width: 180,
      fixed: "left",
      className: "description-cell",
      render: (text, record) => (record.__summary ? <Text strong>{text}</Text> : text)
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
      render: (val) => <Text strong>{val > 0 ? val.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) : "-"}</Text>,
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
          <Col xs={24}><Card><Statistic title={viewMode === 'weekly' ? 'Haftalık Toplam Gelir' : 'Aylık Toplam Gelir'} value={kpiData.total} prefix={<DollarCircleOutlined />} precision={2} /></Card></Col>
        </Row>
      </div>
      
      <div ref={tableHeaderRef} style={{ marginBottom: 'var(--spacing-md)' }}>
        <Row justify="space-between" align="center">
          <Row align="middle" style={{ gap: 'var(--spacing-md)' }}>
            <Tooltip title={expandedKeys.length === 0 ? 'Tümünü Aç' : 'Tümünü Kapat'}>
              <Button
                shape="circle"
                icon={expandedKeys.length === 0 ? <PlusOutlined /> : <MinusOutlined />}
                onClick={() => {
                  setExpandedKeys(expandedKeys.length === 0 ? allGroupKeys : []);
                }}
              />
            </Tooltip>
            <Title level={4} style={{ margin: 0 }}>
              {selectedDate.format('MMMM YYYY')} Raporu
            </Title>
          </Row>
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
          <Row align="middle" style={{ gap: 'var(--spacing-md)' }}>
            <Search
                placeholder="Konum, firma veya açıklamada ara..."
                onSearch={setSearchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 300 }}
            />
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
            <Button icon={<DownloadOutlined />} onClick={() => exportToCSV(columns, filteredData, "gelir_raporu")}>
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
            expandable={{
              expandedRowKeys: expandedKeys,
              onExpandedRowsChange: setExpandedKeys,
              expandRowByClick: true
            }}
            scroll={{ x: 'max-content', y: tableHeight }}
            rowClassName={(record) => {
              if (record.__summary) return "summary-row";
              if (record.children) return "table-group-header";
              return "";
            }}
            bordered
            size="small"
          />
        )}
      </Spin>
    </div>
  );
}