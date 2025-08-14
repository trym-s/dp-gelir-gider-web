import React, { useState, useEffect, useMemo } from 'react';
import { DatePicker, Typography, Row, Col, Spin, Alert, Card, Statistic, Table, Tag } from 'antd';
import { SolutionOutlined, FileDoneOutlined, WalletOutlined, HourglassOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/tr';
import { getMonthlyCollectionsReport } from '../../api/incomeService';

dayjs.locale('tr');
const { Title, Text } = Typography;


const CURRENCIES = {
    TRY: { label: "₺", order: 1, color: "blue", bgColor: 'rgba(22, 119, 255, 0.08)' },
    USD: { label: "$", order: 2, color: "green", bgColor: 'rgba(82, 196, 26, 0.08)' },
    EUR: { label: "€", order: 3, color: "gold", bgColor: 'rgba(250, 173, 20, 0.08)' },
    GBP: { label: "£", order: 4, color: "purple", bgColor: 'rgba(114, 46, 209, 0.08)' },
    AED: { label: "AED", order: 5, color: "orange", bgColor: 'rgba(250, 140, 22, 0.08)' },
};

const MultiCurrencyStatistic = ({ title, data, icon }) => {
    // ... (Bu yardımcı bileşende değişiklik yok, aynı kalabilir) ...
    if (!data || Object.keys(data).length === 0) {
        return <Statistic title={title} value="-" prefix={icon} />;
    }
    const sortedCurrencies = Object.keys(data).sort((a, b) => 
        (CURRENCIES[a]?.order || 99) - (CURRENCIES[b]?.order || 99)
    );
    return (
        <div style={{ minHeight: '88px' }}>
            <Text type="secondary">{icon} {title}</Text>
            {sortedCurrencies.map(currency => (
                <div key={currency} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4px' }}>
                    <Title level={5} style={{ margin: 0, fontWeight: 400 }}>
                        {`${CURRENCIES[currency]?.label || currency}`}
                    </Title>
                    <Title level={4} style={{ margin: 0 }}>
                        {data[currency].toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Title>
                </div>
            ))}
        </div>
    );
};


const FaturaRaporu = () => {
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchReport = async () => {
            setLoading(true);
            setError(null);
            try {
                const month = selectedDate.format('YYYY-MM');
                const data = await getMonthlyCollectionsReport(month);
                setReportData(data);
            } catch (err) {
                setError("Rapor verileri yüklenirken bir hata oluştu.");
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [selectedDate]);
    
    const renderCurrencyCell = (data) => {
        if (!data || Object.keys(data).length === 0) return '-';
        const sortedCurrencies = Object.keys(data).sort((a, b) => (CURRENCIES[a]?.order || 99) - (CURRENCIES[b]?.order || 99));
        return (
            <div>
                {sortedCurrencies.map(currency => (
                    <div key={currency} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Tag color={CURRENCIES[currency]?.color}>{currency}</Tag>
                        <span>{data[currency].toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                    </div>
                ))}
            </div>
        );
    };

    const columns = useMemo(() => {
        if (!reportData?.pivot_data) return [];
        
        const daysInMonth = selectedDate.daysInMonth();
        const dayColumns = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            return {
                title: day.toString(),
                dataIndex: ['daily_totals', day.toString()],
                key: day,
                width: 120,
                align: 'right',
                render: renderCurrencyCell,
                
                onCell: (record) => {
                    const cellData = record.daily_totals?.[day.toString()];
                    if (!cellData) return {}; 

                    const currenciesInCell = Object.keys(cellData);
                    
                    if (currenciesInCell.length === 1) {
                        const currencyCode = currenciesInCell[0];
                        return {
                            style: { backgroundColor: CURRENCIES[currencyCode]?.bgColor || 'transparent' }
                        }
                    }
                    return {}; 
                }
            };
        });

        return [
            { title: "Müşteri", dataIndex: "customer_name", key: "customer_name", fixed: 'left', width: 250 },
            ...dayColumns,
            { 
                title: "Aylık Toplam", 
                dataIndex: "monthly_total", 
                key: "total", 
                fixed: 'right', 
                width: 180, 
                align: 'right', 
                onCell: () => ({ style: { backgroundColor: '#fafafa', fontWeight: 'bold' } }),
                render: (data) => renderCurrencyCell(data)
            },
        ];
    }, [reportData, selectedDate]);

    return (
        <div style={{ padding: 24 }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>Aylık Tahsilat Raporu</Title>
                <DatePicker picker="month" value={selectedDate} onChange={setSelectedDate} allowClear={false} format="MMMM YYYY" />
            </Row>

            <Spin spinning={loading} tip="Yükleniyor...">
                {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 24 }} />}
                {reportData && (
                    <>
                        <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
                            <Col xs={24} sm={12} md={6}>
                                <Card hoverable style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.09)' }}><MultiCurrencyStatistic title="Toplam Fatura Tutarı" data={reportData.kpis.total_invoiced} icon={<FileDoneOutlined />} /></Card>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Card hoverable style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.09)' }}><MultiCurrencyStatistic title="Toplam Tahsilat" data={reportData.kpis.total_received} icon={<WalletOutlined />} /></Card>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Card hoverable style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.09)' }}><MultiCurrencyStatistic title="Kalan Alacak" data={reportData.kpis.remaining} icon={<HourglassOutlined />} /></Card>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Card hoverable style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.09)' }}><Statistic title="Tahsilat Yapılan Müşteri" value={reportData.kpis.customer_count} prefix={<SolutionOutlined />} /></Card>
                            </Col>
                        </Row>

                        <Title level={4} style={{ marginBottom: 16 }}>Günlük Tahsilat Dağılımı</Title>
                        <Table
                            columns={columns}
                            dataSource={reportData.pivot_data}
                            rowKey="customer_name"
                            bordered
                            size="small"
                            pagination={false}
                            scroll={{ x: 'max-content' }}
                            rowClassName={(_, index) => (index % 2 === 1 ? 'table-row-light' : 'table-row-dark')}
                        />
                    </>
                )}
            </Spin>
        </div>
    );
};

export default FaturaRaporu;