import { useState, useMemo, useLayoutEffect, useRef, useEffect } from "react";
import { Table, DatePicker, Typography, Row, Col, Spin, Alert, Input, Button, Card, Statistic, Radio, Tooltip, message } from "antd";
import { DownloadOutlined, DollarCircleOutlined, LeftOutlined, RightOutlined, FilterOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import './IncomePivot.css';
import dayjs from "dayjs";
import "dayjs/locale/tr";
import { getIncomePivot, getIncomeYearlyPivot } from "../../api/incomeService";
import * as XLSX from "xlsx";

dayjs.locale("tr");
const { Title, Text } = Typography;
const { Search } = Input;

const getHeatmapColor = (value, max) => {
    if (!value || value === 0 || max === 0) return 'transparent';
    const intensity = Math.min(value / max, 1.0);
    const hue = 120;
    const saturation = 100;
    const lightness = 95 - (intensity * 40);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// --- BU KISIM SİZİN KODUNUZDAN ALINDI ---
const currencySymbols = {
    TRY: '₺',
    USD: '$',
    EUR: '€',
    GBP: '£',
    AED: 'AED'
};

const formatCurrency = (value, currency) => {
    return `${currencySymbols[currency] || ''}${(value || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`;
};

const renderCurrencyCell = (currencyObject) => {
    if (!currencyObject || typeof currencyObject !== 'object' || Object.keys(currencyObject).length === 0) {
        return "-";
    }
    return (
        <div>
            {Object.entries(currencyObject).map(([currency, value]) => (
                <div key={currency}>{formatCurrency(value, currency)}</div>
            ))}
        </div>
    );
};
// --- YARDIMCI FONKSİYONLAR SONU ---


const exportToExcel = (columns, data, fileName, viewMode, selectedDate, currentWeek) => {
    // === YARDIMCI FONKSİYONLAR (Değişiklik yok) ===
    const addCurrencyObjects = (obj1, obj2) => {
        const result = { ...obj1 };
        for (const currency in obj2) {
            if (obj2.hasOwnProperty(currency)) {
                result[currency] = (result[currency] || 0) + (parseFloat(obj2[currency]) || 0);
            }
        }
        return result;
    };
    
    const valueToString = (value) => {
        if (value === null || typeof value === 'undefined') return "0.00";
        if (typeof value === 'number') return value.toFixed(2);
        if (typeof value === 'object' && Object.keys(value).length > 0) {
            return Object.entries(value)
                .map(([currency, numValue]) => `${(parseFloat(numValue) || 0).toFixed(2)} ${currency}`)
                .join(' | ');
        }
        return "0.00";
    };

    // === 1. BAŞLIKLARI VE DOSYA ADINI AYARLA (Değişiklik yok) ===
    let timeColTitles = [];
    let dynamicFileName = fileName;
    if (viewMode === 'yearly') {
        const year = selectedDate.format("YYYY");
        timeColTitles = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
        dynamicFileName = `${fileName}_${year}`;
    } else if (viewMode === 'weekly') {
        timeColTitles = columns.map(c => c.title).filter(title => !isNaN(parseInt(title, 10)));
        dynamicFileName = `${fileName}_${selectedDate.format("YYYY_MM")}_hafta_${currentWeek}`;
    } else { // monthly
        timeColTitles = columns.map(c => c.title).filter(title => !isNaN(parseInt(title, 10)));
        dynamicFileName = `${fileName}_${selectedDate.format("YYYY_MM")}`;
    }
    const headers = ["Bütçe Kalemi", "Firma", "Açıklama", ...timeColTitles, "Toplam"];
    
    // === 2. VERİ SATIRLARINI VE GENEL TOPLAMLARI HESAPLA ===
    const grandTotals = {};
    const excelDataRows = data.reduce((rows, parent) => {
        
        // --- DEĞİŞİKLİK BURADA: Önce bütçe kalemi (parent) için sütun toplamlarını HESAPLIYORUZ ---
        const parentColumnTotals = {};
        (parent.children || []).forEach(child => {
            timeColTitles.forEach((title, index) => {
                const dataIndex = viewMode === 'yearly' ? (index + 1).toString() : title;
                const cellData = child[dataIndex];
                const valueToProcess = (viewMode === 'yearly' && cellData && cellData.total) ? cellData.total : cellData;
                
                if (valueToProcess && typeof valueToProcess === 'object') {
                    parentColumnTotals[dataIndex] = addCurrencyObjects(parentColumnTotals[dataIndex] || {}, valueToProcess);
                }
            });
            if (child.toplam && typeof child.toplam === 'object') {
                parentColumnTotals['toplam'] = addCurrencyObjects(parentColumnTotals['toplam'] || {}, child.toplam);
            }
        });
        
        // Şimdi HESAPLANAN bu toplamları kullanarak ana grup satırını oluşturuyoruz.
        const parentTimeValues = timeColTitles.map((title, index) => {
            const dataIndex = viewMode === 'yearly' ? (index + 1).toString() : title;
            return valueToString(parentColumnTotals[dataIndex]);
        });
        const parentRow = [parent.budget_item_name, "", "", ...parentTimeValues, valueToString(parentColumnTotals['toplam'])];
        rows.push(parentRow);
        // --- DEĞİŞİKLİK SONU ---

        // Alt kırılım (child) satırlarını ve genel toplamları işlemeye devam et
        (parent.children || []).forEach(child => {
            const childRow = ["", child.firma, child.description];
            timeColTitles.forEach((title, index) => {
                const dataIndex = viewMode === 'yearly' ? (index + 1).toString() : title;
                const cellData = child[dataIndex];
                const valueToProcess = (viewMode === 'yearly' && cellData && cellData.total) ? cellData.total : cellData;
                childRow.push(valueToString(valueToProcess));
                if (valueToProcess && typeof valueToProcess === 'object') {
                    grandTotals[dataIndex] = addCurrencyObjects(grandTotals[dataIndex] || {}, valueToProcess);
                }
            });
            childRow.push(valueToString(child.toplam));
            if (child.toplam && typeof child.toplam === 'object') {
                grandTotals['toplam'] = addCurrencyObjects(grandTotals['toplam'] || {}, child.toplam);
            }
            rows.push(childRow);
        });
        
        return rows;
    }, []);

    if (excelDataRows.length === 0) { message.warning("Dışa aktarılacak veri bulunamadı."); return; }
    
    // === 3. GENEL TOPLAM SATIRINI OLUŞTUR (Değişiklik yok) ===
    const totalRow = ["GENEL TOPLAM", "", ""];
    timeColTitles.forEach((title, index) => {
        const dataIndex = viewMode === 'yearly' ? (index + 1).toString() : title;
        totalRow.push(valueToString(grandTotals[dataIndex]));
    });
    totalRow.push(valueToString(grandTotals['toplam']));

    // === 4. EXCEL DOSYASINI OLUŞTUR VE İNDİR (Değişiklik yok) ===
    const finalData = [headers, ...excelDataRows, [], totalRow];
    const worksheet = XLSX.utils.aoa_to_sheet(finalData);
    worksheet['!cols'] = headers.map(header => ({ wch: Math.max(header.length, 20) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Gelir Raporu`);
    XLSX.writeFile(workbook, `${dynamicFileName}.xlsx`);
};

export default function GelirRaporu() {
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [searchText, setSearchText] = useState('');
    const [viewMode, setViewMode] = useState('monthly');
    const [currentWeek, setCurrentWeek] = useState(1);
    const [tableHeight, setTableHeight] = useState(0);
    const [isToolbarVisible, setIsToolbarVisible] = useState(false);
    const [expandedKeys, setExpandedKeys] = useState([]);
    
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const headerRef = useRef(null);
    const kpiRef = useRef(null);
    const tableHeaderRef = useRef(null);
    const toolbarRef = useRef(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                let responseData;
                if (viewMode === 'yearly') {
                    responseData = await getIncomeYearlyPivot(selectedDate.year());
                } else {
                    responseData = await getIncomePivot(selectedDate.format("YYYY-MM"));
                }
                setData(responseData);

                if (Array.isArray(responseData)) {
                    const allKeys = responseData
                        .filter(item => item.children && item.children.length > 0)
                        .map(item => item.budget_item_name);
                    setExpandedKeys(allKeys);
                }
            } catch (err) {
                setError("Veri yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [selectedDate, viewMode]);

    useLayoutEffect(() => {
        const calculateHeight = () => {
            const headerHeight = headerRef.current?.offsetHeight || 0;
            const kpiHeight = kpiRef.current?.offsetHeight || 0;
            const tableHeaderHeight = tableHeaderRef.current?.offsetHeight || 0;
            const toolbarHeight = isToolbarVisible ? (toolbarRef.current?.offsetHeight || 0) : 0;
            const extraPadding = 80;
            const totalOffset = headerHeight + kpiHeight + tableHeaderHeight + toolbarHeight + extraPadding;
            const newHeight = window.innerHeight - totalOffset;
            setTableHeight(newHeight > 200 ? newHeight : 200);
        };

        const timer = setTimeout(calculateHeight, 50);
        window.addEventListener('resize', calculateHeight);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', calculateHeight);
        };
    }, [isLoading, isToolbarVisible, data]);

    const daysInMonth = selectedDate.daysInMonth();
    const weeksInMonth = Math.ceil(daysInMonth / 7);

    const handleWeekChange = (direction) => {
        setCurrentWeek(prev => {
            const newWeek = prev + direction;
            return (newWeek > 0 && newWeek <= weeksInMonth) ? newWeek : prev;
        });
    };
  

    // --- BU useMemo BLOĞUNU TAMAMEN DEĞİŞTİRİN ---
    const { filteredData, kpiData } = useMemo(() => {
        if (!data || !Array.isArray(data) || data.length === 0) {
            return { filteredData: [], kpiData: {} };
        }
        // Para birimi nesnelerini toplamak için yardımcı fonksiyon
        const addCurrencyObjects = (obj1, obj2) => {
            const result = { ...obj1 };
            for (const currency in obj2) {
                if (obj2.hasOwnProperty(currency)) {
                    const value = parseFloat(obj2[currency]) || 0;
                    result[currency] = (result[currency] || 0) + value;
                }
            }
            return result;
        };
        let processedData = data;
        // --- DÜZELTME: EKSİK OLAN HAFTALIK HESAPLAMA MANTIĞI EKLENDİ ---
        if (viewMode === 'weekly') {
            const startDay = (currentWeek - 1) * 7 + 1;
            const endDay = Math.min(currentWeek * 7, daysInMonth);
            processedData = data.map(parent => {
                // Önce her bir alt kalemin (child) haftalık toplamını hesapla
                const newChildren = (parent.children || []).map(child => {
                    let weeklyChildTotal = {};
                    for (let day = startDay; day <= endDay; day++) {
                        const dayData = child[String(day)];
                        if (dayData && typeof dayData === 'object') {
                            weeklyChildTotal = addCurrencyObjects(weeklyChildTotal, dayData);
                        }
                    }
                    // Çocuğun 'toplam' alanını haftalık toplamla güncelle
                    return { ...child, toplam: weeklyChildTotal };
                });
                // Şimdi güncellenmiş çocuklardan ana grubun (parent) haftalık toplamını hesapla
                let weeklyParentTotal = {};
                newChildren.forEach(child => {
                    weeklyParentTotal = addCurrencyObjects(weeklyParentTotal, child.toplam);
                });
                // Ana grubun 'children' ve 'toplam' alanlarını haftalık değerlerle güncelle
                return { ...parent, children: newChildren, toplam: weeklyParentTotal };
            });
        }
        // --- DÜZELTME SONU ---
        // Arama (Search) mantığı, artık haftalık veya aylık olarak işlenmiş veri üzerinde çalışır
        const lowercasedFilter = searchText.toLowerCase();
        const searchedData = processedData.map(parent => {
            if (!searchText) return parent;
            const filteredChildren = (parent.children || []).filter(child =>
                (child.firma && child.firma.toLowerCase().includes(lowercasedFilter)) ||
                (child.description && child.description.toLowerCase().includes(lowercasedFilter))
            );
            if (parent.budget_item_name.toLowerCase().includes(lowercasedFilter) || filteredChildren.length > 0) {
                return { ...parent, children: filteredChildren.length > 0 ? filteredChildren : parent.children };
            }
            return null;
        }).filter(Boolean);
        // KPI verisi de yine haftalık veya aylık olarak işlenmiş veriden hesaplanır
        const totalByCurrency = {};
        processedData.forEach(parent => {
            // parent.toplam'ın burada doğru (haftalık veya aylık) değeri içerdiğinden emin oluruz
            if (parent.toplam && typeof parent.toplam === 'object') {
                Object.entries(parent.toplam).forEach(([currency, value]) => {
                    totalByCurrency[currency] = (totalByCurrency[currency] || 0) + (parseFloat(value) || 0);
                });
            }
        });
        return { filteredData: searchedData, kpiData: totalByCurrency };
    }, [data, searchText, viewMode, currentWeek, daysInMonth]); // Bağımlılıklar güncellendi

    const allGroupKeys = useMemo(() =>
        filteredData
            .filter(item => item.children && item.children.length > 0)
            .map(item => item.budget_item_name)
    , [filteredData]);
    
    // --- DEĞİŞİKLİK: timeColumns, para birimlerini ve Tooltip'i gösterecek şekilde güncellendi ---
    const timeColumns = useMemo(() => {
        const renderCellWithTooltip = (cellData) => {
            if (typeof cellData === 'object' && cellData !== null) {
                // Yıllık rapordan gelen detaylı veri
                if (cellData.total && Object.keys(cellData.total).length > 0) {
                    const tooltipContent = <div>{cellData.details.map((d, i) => <div key={i}>{d}</div>)}</div>;
                    return <Tooltip title={tooltipContent}>{renderCurrencyCell(cellData.total)}</Tooltip>;
                }
                // Aylık/Haftalık veya grup başlığından gelen veri
                if (Object.keys(cellData).length > 0) {
                    return renderCurrencyCell(cellData);
                }
            }
            return "-";
        };

        if (viewMode === 'yearly') {
            const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
            return monthNames.map((month, index) => ({
                title: month,
                dataIndex: (index + 1).toString(),
                key: (index + 1).toString(),
                width: 120,
                align: "right",
                render: (val, record) => renderCellWithTooltip(record.children ? val : record[String(index + 1)]),
            }));
        }

        const startDay = (currentWeek - 1) * 7 + 1;
        const endDay = Math.min(currentWeek * 7, daysInMonth);
        const daysToShow = viewMode === 'weekly' ? Array.from({ length: endDay - startDay + 1 }, (_, i) => startDay + i) : Array.from({ length: daysInMonth }, (_, i) => i + 1);

        return daysToShow.map(day => ({
            title: day.toString(),
            dataIndex: day.toString(),
            key: day.toString(),
            width: 120,
            align: "right",
            render: (val, record) => renderCurrencyCell(record.children ? val : record[String(day)]),
        }));
    }, [viewMode, currentWeek, daysInMonth]);

    const columns = [
        { title: "Bütçe Kalemi", dataIndex: "budget_item_name", key: "budget_item_name", width: 220, fixed: 'left', className: 'description-cell', render: (text, record) => record.children ? <strong>{text}</strong> : null },
        { title: "Firma", dataIndex: "firma", key: "firma", width: 180, fixed: 'left', className: 'description-cell' },
        { title: "Açıklama", dataIndex: "description", key: "description", width: 250, className: 'description-cell' },
        ...timeColumns,
        // --- DEĞİŞİKLİK: Toplam sütunu da para birimlerini gösterecek ---
        { title: "Toplam", dataIndex: "toplam", key: "toplam", width: 150, fixed: 'right', align: "right", render: (val) => <strong>{renderCurrencyCell(val)}</strong> },
    ];

    return (
        <div className="gelir-raporu-container">
            <div ref={headerRef}><Title level={2} style={{ margin: 0, marginBottom: 'var(--spacing-xl)' }}>Gelir Raporlama</Title></div>
            <div ref={kpiRef}>
                <Row gutter={[24, 24]} style={{ marginBottom: 'var(--spacing-xl)' }}>
                    {/* --- DEĞİŞİKLİK: KPI kartı, para birimlerine göre toplamları gösteriyor --- */}
                    <Col xs={24}><Card><Statistic title={viewMode === 'yearly' ? "Yıllık Toplam Gelir" : "Aylık Toplam Gelir"} valueRender={() => (
                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '24px' }}>
                           {Object.keys(kpiData).length > 0 ? Object.entries(kpiData).map(([currency, value]) => (
                                <span key={currency}>{formatCurrency(value, currency)}</span>
                            )) : <span>{formatCurrency(0, 'TRY')}</span>}
                        </div>
                    )} /></Card></Col>
                </Row>
            </div>
            <div ref={tableHeaderRef} style={{ marginBottom: 'var(--spacing-md)' }}>
                <Row justify="space-between" align="center">
                    <Row align="middle" style={{ gap: 'var(--spacing-md)' }}>
                        <Tooltip title={expandedKeys.length === 0 ? 'Tümünü Aç' : 'Tümünü Kapat'}><Button shape="circle" icon={expandedKeys.length === 0 ? <PlusOutlined /> : <MinusOutlined />} onClick={() => setExpandedKeys(expandedKeys.length === 0 ? allGroupKeys : [])} /></Tooltip>
                        <Title level={4} style={{ margin: 0 }}>{selectedDate.format(viewMode === 'yearly' ? 'YYYY' : 'MMMM YYYY')} Raporu</Title>
                    </Row>
                    <Tooltip title="Filtre ve Seçenekler" placement="bottom"><Button icon={<FilterOutlined />} type={isToolbarVisible ? 'primary' : 'default'} onClick={() => setIsToolbarVisible(!isToolbarVisible)} /></Tooltip>
                </Row>
            </div>
            {isToolbarVisible && (
                <div ref={toolbarRef} className="toolbar" style={{ marginBottom: 'var(--spacing-md)' }}>
                    <Search placeholder="Firma veya açıklamada ara..." onSearch={setSearchText} onChange={(e) => setSearchText(e.target.value)} style={{ width: 300 }} />
                    <Row align="middle" style={{ gap: 'var(--spacing-md)' }}>
                        <Radio.Group value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
                            <Radio.Button value="monthly">Aylık</Radio.Button>
                            <Radio.Button value="weekly">Haftalık</Radio.Button>
                            <Radio.Button value="yearly">Yıllık</Radio.Button>
                        </Radio.Group>
                        {viewMode === 'weekly' ? (
                            <Row align="middle" style={{ gap: 'var(--spacing-sm)' }}><Button icon={<LeftOutlined />} onClick={() => handleWeekChange(-1)} disabled={currentWeek === 1} /><Text>Hafta {currentWeek}</Text><Button icon={<RightOutlined />} onClick={() => handleWeekChange(1)} disabled={currentWeek === weeksInMonth} /></Row>
                        ) : (
                            <DatePicker picker={viewMode === 'yearly' ? 'year' : 'month'} value={selectedDate} onChange={(date) => { if (date) { setSelectedDate(date); setCurrentWeek(1); } }} allowClear={false} />
                        )}
                        <Button icon={<DownloadOutlined />} onClick={() => exportToExcel(columns, filteredData, "gelir_raporu", viewMode, selectedDate, currentWeek)}>Excel İndir</Button>
                    </Row>
                </div>
            )}
            <Spin spinning={isLoading} tip="Yükleniyor..." size="large">
                {error ? (<Alert message="Hata" description={error} type="error" showIcon />) : (
                    <Table
                        columns={columns}
                        dataSource={filteredData}
                        pagination={false}
                        rowKey="budget_item_name"
                        expandable={{ expandedRowKeys: expandedKeys, onExpand: (expanded, record) => { const key = record.budget_item_name; const newKeys = expanded ? [...expandedKeys, key] : expandedKeys.filter(k => k !== key); setExpandedKeys(newKeys); } }}
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