import { useState, useMemo, useLayoutEffect, useRef } from "react";
import { Table, DatePicker, Typography, Row, Col, Spin, Alert, Input, Button, Card, Statistic, Radio, Tooltip, message } from "antd";
import { DownloadOutlined, DollarCircleOutlined, LeftOutlined, RightOutlined, FilterOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import './IncomePivot.css';
import dayjs from "dayjs";
import "dayjs/locale/tr";
import { useIncomePivot } from "../../hooks/useIncomePivot";
import * as XLSX from "xlsx";

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

const exportToExcel = (columns, data, fileName) => {
    // 1. Başlıkları (Headers) istediğimiz kesin sırada oluşturuyoruz.
    // Gün sütun başlıklarını alıyoruz (örn: "1", "2", "3"...)
    const dayColTitles = columns
        .filter(c => c.key && c.key.toString().match(/^\d+$/))
        .map(c => c.title);

    // Excel dosyasının nihai başlık sırası
    const headers = [
        "Bütçe Kalemi",
        "Firma",
        "Açıklama",
        ...dayColTitles, // Dinamik gün başlıklarını araya ekliyoruz
        "Toplam"
    ];

    // 2. Veri satırlarını (Rows) başlıklarla tam olarak aynı sırada oluşturuyoruz.
    // `flatMap` ile iç içe geçmiş veriyi düz bir liste haline getiriyoruz.
    const excelDataRows = data.flatMap(parent =>
        // Sadece alt kırılımları (children) alıyoruz, ana grup satırlarını atlıyoruz.
        (parent.children || []).map(child => {
            // Her bir 'child' (gelir kalemi) için yeni bir satır dizisi oluşturuyoruz.
            const row = [];
            
            // DİKKAT: Verileri 'headers' dizisiyle aynı sırada ekliyoruz.
            row.push(parent.budget_item_name); // Bütçe Kalemi (Ana gruptan gelir)
            row.push(child.firma);             // Firma (DÜZELTİLDİ)
            row.push(child.description);       // Açıklama (DÜZELTİLDİ)

            // Günleri sırayla ekliyoruz. Eğer o güne ait veri yoksa 0 yazıyoruz.
            dayColTitles.forEach(day => {
                row.push(child[day] || 0);
            });

            // Toplamı en sona ekliyoruz.
            row.push(child.toplam || 0);

            return row;
        })
    );

    // Aktarılacak veri yoksa uyarı verip işlemi sonlandırıyoruz.
    if (excelDataRows.length === 0) {
        message.warning("Dışa aktarılacak veri bulunamadı.");
        return;
    }

    // 3. Başlıkları ve veri satırlarını birleştiriyoruz.
    const finalData = [headers, ...excelDataRows];

    // 4. "Diziler dizisi" formatını kullanarak Excel sayfası oluşturuyoruz (en güvenilir yöntem).
    const worksheet = XLSX.utils.aoa_to_sheet(finalData);

    // Sütun genişliklerini otomatik ayarla (isteğe bağlı ama kullanışlı)
    const colWidths = headers.map(header => ({ wch: Math.max(header.length, 15) }));
    worksheet['!cols'] = colWidths;

    // 5. Kitabı oluşturup dosyayı indiriyoruz.
    const workbook = XLSX.utils.book_new();
    // Sayfa adını daha anlamlı hale getirdik.
    XLSX.utils.book_append_sheet(workbook, worksheet, "Gelir Raporu"); 
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};


export default function GelirRaporu() {
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [searchText, setSearchText] = useState('');
  const [viewMode, setViewMode] = useState('monthly');
  const [currentWeek, setCurrentWeek] = useState(1);
  const [tableHeight, setTableHeight] = useState(0);
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);
  const { data, isLoading, error } = useIncomePivot(selectedDate);
  const [expandedKeys, setExpandedKeys] = useState([]);

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

  const allGroupKeys = useMemo(() => 
    filteredData
        .filter(item => item.children && item.children.length > 0) // Sadece alt öğesi olan grupları al
        .map(item => item.budget_item_name) // Grupların key'i olarak budget_item_name'i kullan
  , [filteredData]);


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
            <Button icon={<DownloadOutlined />} onClick={() => exportToExcel(columns, filteredData, "gelir_raporu")}>
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
            rowKey="budget_item_name" // 1. Her satır için benzersiz anahtar
            expandable={{            // 2. Genişletme davranışını kontrol altına al
                expandedRowKeys: expandedKeys,
                onExpand: (expanded, record) => {
                    const key = record.budget_item_name;
                    const newKeys = expanded
                        ? [...expandedKeys, key] // Satır açılıyorsa, key'i diziye ekle
                        : expandedKeys.filter(k => k !== key); // Kapanıyorsa, key'i diziden çıkar
                    setExpandedKeys(newKeys);
                },
            }}

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
