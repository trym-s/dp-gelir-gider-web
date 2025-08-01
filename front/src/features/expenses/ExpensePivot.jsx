import { useState, useMemo, useLayoutEffect, useRef } from "react";
import { Table, DatePicker, Typography, Row, Col, Spin, Alert, Input, Button, Card, Statistic, Radio, Tooltip } from "antd";
import { DownloadOutlined, DollarCircleOutlined, LeftOutlined, RightOutlined, FilterOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import './ExpensePivot.css';
import dayjs from "dayjs";
import "dayjs/locale/tr";
import { useExpensePivot } from "../../hooks/useExpensePivot";
import * as XLSX from 'xlsx';

dayjs.locale("tr");
const { Title, Text } = Typography;
const { Search } = Input;

const getHeatmapColor = (value, max) => {
  if (value === 0 || max === 0) return 'transparent';
  const intensity = Math.min(value / max, 1.0);
  const hue = 0; // Red for expenses
  const saturation = 100;
  const lightness = 95 - (intensity * 40);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

const exportToExcel = (columns, data, fileName) => {
    // 1. Başlıkları (Headers) istediğimiz kesin sırada oluşturuyoruz.
    const dayColTitles = columns
        .filter(c => c.key.toString().match(/^\d+$/))
        .map(c => c.title);

    const headers = [
        "Bütçe Kalemi",
        "Konum",
        "Hesap Adı",
        "Açıklama",
        ...dayColTitles, // Günleri buraya ekliyoruz
        "Toplam"
    ];

    // 2. Veri satırlarını (Rows) başlıklarla tam olarak aynı sırada oluşturuyoruz.
    const excelDataRows = data.flatMap(parent =>
        (parent.children || []).filter(child => !child.__summary).map(child => {
            const row = []; // Her gider için yeni bir satır dizisi
            
            // Başlık sırasına göre verileri diziye ekle
            row.push(parent.budget_item_name);
            row.push(child.region_name);
            row.push(child.account_name);
            row.push(child.description);

            // Günleri ekle
            dayColTitles.forEach(day => {
                row.push(child[day] || 0);
            });

            // Toplamı en sona ekle
            row.push(child.toplam || 0);

            return row;
        })
    );

    if (excelDataRows.length === 0) {
        message.warning("Dışa aktarılacak veri bulunamadı.");
        return;
    }

    // 3. Başlıkları ve veri satırlarını birleştiriyoruz.
    const finalData = [headers, ...excelDataRows];

    // 4. "Diziler dizisi" formatını kullanarak Excel sayfası oluşturuyoruz (en güvenilir yöntem).
    const worksheet = XLSX.utils.aoa_to_sheet(finalData);

    // 5. Kitabı oluşturup dosyayı indiriyoruz.
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "GiderRaporu");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export default function GiderRaporu() {
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [searchText, setSearchText] = useState('');
  const [viewMode, setViewMode] = useState('monthly');
  const [currentWeek, setCurrentWeek] = useState(1);
  const [tableHeight, setTableHeight] = useState(0);
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState([]);
  const { data, isLoading, error } = useExpensePivot(selectedDate);

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
    const lowercasedSearchText = searchText.toLowerCase();
    const searchedData = !searchText ? data : data.map(parent => {
      const filteredChildren = parent.children.filter(child => 
        child.region_name?.toLowerCase().includes(lowercasedSearchText) ||
        child.account_name?.toLowerCase().includes(lowercasedSearchText) ||
        child.description?.toLowerCase().includes(lowercasedSearchText)
      );

      // Eğer alt kayıtlarda eşleşme varsa, ana grubu da dahil et
      if (filteredChildren.length > 0) {
        return { ...parent, children: filteredChildren };
      }
      return null;
    }).filter(Boolean); // null olan kayıtları temizle

    let maxVal = 0;
    const startDay = (currentWeek - 1) * 7 + 1;
    const endDay = Math.min(currentWeek * 7, daysInMonth);

    if (viewMode === "weekly") {
      const weeklyData = searchedData
        .map((parent) => {
          if (!parent.children) return null;

          const filteredChildren = parent.children.map((child) => {
            const hasWeeklyData = Array.from({ length: endDay - startDay + 1 }, (_, i) => startDay + i)
              .some((day) => child[day] && child[day] > 0);

            if (!hasWeeklyData) return null;

            const childFiltered = { ...child, toplam: 0 };
            for (let i = 1; i <= daysInMonth; i++) {
              if (i < startDay || i > endDay) {
                delete childFiltered[i];
              } else {
                childFiltered.toplam += child[i] || 0;
                if ((child[i] || 0) > maxVal) maxVal = child[i];
              }
            }

            return childFiltered;
          }).filter(Boolean);

          if (filteredChildren.length === 0) return null;

          const summary = {
            key: `${parent.budget_item_name}_summary`,
            budget_item_name: parent.budget_item_name,
            region_name: "Ara Toplam",
            account_name: "",
            description: "",
            __summary: true,
            toplam: 0
          };

          for (let i = startDay; i <= endDay; i++) {
            summary[i] = filteredChildren.reduce((sum, c) => sum + (c[i] || 0), 0);
            summary.toplam += summary[i];
          }

          const parentRow = {
            ...parent,
            toplam: summary.toplam
          };

          for (let i = 1; i <= daysInMonth; i++) {
            parentRow[i] = i >= startDay && i <= endDay ? summary[i] : undefined;
          }

          return {
            ...parentRow,
            children: [...filteredChildren, summary]
          };
        })
        .filter(Boolean);

      const total = weeklyData.reduce((sum, p) => sum + (p.toplam || 0), 0);
      return { filteredData: weeklyData, kpiData: { total }, maxDailyValue: maxVal };
    }

    const processedData = searchedData.map((parent) => {
      if (!parent.children) return parent;

      const summary = {
        key: `${parent.budget_item_name}_summary`,
        budget_item_name: parent.budget_item_name,
        region_name: "Ara Toplam",
        account_name: "",
        description: "",
        __summary: true,
        toplam: 0
      };

      for (let i = 1; i <= daysInMonth; i++) {
        summary[i] = parent.children.reduce((sum, c) => sum + (c[i] || 0), 0);
        summary.toplam += summary[i];
        if (summary[i] > maxVal) maxVal = summary[i];
      }

      const parentRow = {
        ...parent,
        toplam: summary.toplam
      };
      for (let i = 1; i <= daysInMonth; i++) {
        parentRow[i] = summary[i];
      }

      return {
        ...parentRow,
        children: [...parent.children, summary]
      };
    });

    const total = processedData.reduce((sum, p) => sum + (p.toplam || 0), 0);
    return { filteredData: processedData, kpiData: { total }, maxDailyValue: maxVal };
}, [data, searchText, viewMode, currentWeek, daysInMonth]);

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
          backgroundColor: record.__summary
            ? "#f0f5ff"
            : getHeatmapColor(record[day], maxDailyValue),
          fontWeight: record.__summary ? "bold" : "normal"
        }
      }),
      render: (val, record) => {
        const isGroupHeader = record.children;
        const isCollapsed = !expandedKeys.includes(record.key);
        if (isGroupHeader && !isCollapsed) return "";
        return val > 0
          ? val.toLocaleString("tr-TR", { minimumFractionDigits: 2 })
          : "";
      }
    }));
  }, [viewMode, currentWeek, daysInMonth, maxDailyValue, expandedKeys]);

  const columns = [
    {
      title: "Bütçe Kalemi",
      dataIndex: "budget_item_name",
      key: "budget_item_name",
      width: 220,
      fixed: 'left',
      className: 'description-cell',
      // Sadece ana grup satırlarında (children olanlarda) Bütçe Kalemi adını göster
      render: (text, record) => record.children ? <strong key={record.key}>{text}</strong> : null,
    },
    {
      title: "Konum",
      dataIndex: "region_name",
      key: "region_name",
      width: 180,
      fixed: 'left',
      className: 'description-cell',
      // Ara toplam satırları için kalın yazı stili uygula
       render: (text, record) =>
          record.__summary ? <strong key={record.key}>{text}</strong> : text
    },
    // --- HESAP ADI KOLONU ARTIK DOĞRU ÇALIŞACAK ---
    {
      title: "Hesap Adı",
      dataIndex: "account_name",
      key: "account_name",
      width: 180,
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
      render: (val, record) => {
          // Genişletilmiş grup başlıklarında bu alanı boş bırak
          const isCollapsed = !expandedKeys.includes(record.key);
          const isGroupHeader = record.children;
          if (isGroupHeader && !isCollapsed) return null;

          // Değerleri formatla
          return (
            <strong key={record.key}>
              {val > 0 ? val.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) : "-"}
            </strong>
          );
        },
      onCell: (record) => ({
        className: record.children ? 'total-cell' : '',
      }),
    },
  ];

  return (
    <div className="gider-raporu-container">
      <div ref={headerRef}>
        <Title level={2} style={{ margin: 0, marginBottom: 'var(--spacing-xl)' }}>Gider Raporlama</Title>
      </div>

      <div ref={kpiRef}>
        <Row gutter={[24, 24]} style={{ marginBottom: 'var(--spacing-xl)' }}>
          <Col xs={24}><Card><Statistic title={viewMode === 'weekly' ? 'Haftalık Toplam Gider' : 'Aylık Toplam Gider'} value={kpiData.total} prefix={<DollarCircleOutlined />} precision={2} /></Card></Col>
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
              placeholder="Konum, hesap adı veya açıklamada ara..."
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
            <Button icon={<DownloadOutlined />} onClick={() => exportToExcel(columns, filteredData, "gider_raporu")}>
              Excel İndir
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