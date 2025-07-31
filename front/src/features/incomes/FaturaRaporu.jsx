// front/src/features/incomes/FaturaRaporu.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { DatePicker, Typography, Row, Col, Spin, Alert, Card, Statistic, Table } from 'antd';
// --- EKSİK OLAN IMPORT SATIRI BURAYA EKLENDİ ---
import { SolutionOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/tr';
import { getIncomeReportPivot } from '../../api/incomeService';

dayjs.locale('tr');
const { Title } = Typography;

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
                const data = await getIncomeReportPivot(month);
                setReportData(data);
            } catch (err) {
                setError("Rapor verileri yüklenirken bir hata oluştu.");
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [selectedDate]);

    const columns = useMemo(() => {
        if (!reportData || !reportData.pivot_data) return [];
        const daysInMonth = selectedDate.daysInMonth();
        const dayColumns = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            return {
                title: day.toString(),
                dataIndex: day,
                key: day,
                width: 70,
                align: 'right',
                render: (val) => val ? val.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺' : '-',
            };
        });

        return [
            { title: "Müşteri", dataIndex: "customer_name", key: "customer_name", fixed: 'left', width: 250 },
            ...dayColumns,
            { title: "Aylık Toplam", dataIndex: "total", key: "total", fixed: 'right', width: 150, align: 'right', render: (val) => <strong>{val ? val.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) : '-'}</strong> },
        ];
    }, [reportData, selectedDate]);

    return (
        <div style={{ padding: 24 }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>Aylık Fatura Raporu</Title>
                <DatePicker 
                    picker="month" 
                    value={selectedDate} 
                    onChange={setSelectedDate} 
                    allowClear={false}
                    format="MMMM YYYY"
                />
            </Row>

            <Spin spinning={loading} tip="Yükleniyor...">
                {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 24 }} />}
                
                {reportData && (
                    <>
                        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                            <Col xs={24} sm={12} md={6}>
                                <Card><Statistic title="Toplam Fatura Tutarı" value={reportData.kpis.total_invoiced} precision={2} prefix="₺" /></Card>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Card><Statistic title="Toplam Tahsilat" value={reportData.kpis.total_received} precision={2} prefix="₺" valueStyle={{ color: '#3f8600' }} /></Card>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Card><Statistic title="Kalan Alacak" value={reportData.kpis.remaining} precision={2} prefix="₺" valueStyle={{ color: '#cf1322' }} /></Card>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Card><Statistic title="Fatura Kesilen Müşteri" value={reportData.kpis.customer_count} prefix={<SolutionOutlined />} /></Card>
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
                        />
                    </>
                )}
            </Spin>
        </div>
    );
};

export default FaturaRaporu;