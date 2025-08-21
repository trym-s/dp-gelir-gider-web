// src/features/dashboard/activity-log/IncomeExpenseTab.jsx

import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Input, Select, DatePicker, Table, Tag, Spin, Empty, Collapse, Typography, message } from 'antd';
import { RiseOutlined, FallOutlined, SwapOutlined, FundViewOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getTransactions } from '../../../api/transactionService';
import { formatCurrency } from '../../../utils/formatting';

const { Search } = Input;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { Panel } = Collapse;

const transactionCategories = ['Gelir Tahsilatı', 'Gider Ödemesi', 'Kredi Ödemesi', 'Kredi Kartı Harcaması', 'Kredi Kartı Ödemesi'];

// Sütunlara 'sorter: true' ve backend ile eşleşen 'key'ler eklendi
const columns = [
    {
        title: 'Tarih',
        dataIndex: 'date',
        key: 'date',
        render: (text) => dayjs(text).format('DD.MM.YYYY HH:mm'),
        width: 120,
        sorter: true,
    },
    {
        title: 'Kategori',
        dataIndex: 'category',
        key: 'category',
        render: (category) => {
            let color = 'default';
            if (category?.includes('Gelir')) color = 'success';
            if (category?.includes('Gider') || category?.includes('Harcama')) color = 'error';
            if (category?.includes('Ödeme')) color = 'processing';
            return <Tag color={color}>{category?.toUpperCase() || 'BİLİNMİYOR'}</Tag>;
        },
        width: 180,
        sorter: true,
    },
    {
        title: 'Fatura No',
        dataIndex: 'invoiceNumber',
        key: 'invoiceNumber',
        render: (text) => text || '-',
        width: 130,
    },
    {
        title: 'Bölge',
        dataIndex: 'region',
        key: 'region',
        render: (text) => text || '-',
        width: 120,
    },
    {
        title: 'İsim', // Sütun adı değişti
        dataIndex: 'bank_or_company',  // dataIndex backend'e göre değişti
        key: 'bank_or_company',      // key backend'e göre değişti
        render: (text) => (
            <Typography.Text ellipsis={{ tooltip: text }}>
                {text}
            </Typography.Text>
        ),
        sorter: true,
    },
    {
        title: 'Açıklama', // YENİ SÜTUN
        dataIndex: 'description',
        key: 'description',
        render: (text) => (
            <Typography.Text ellipsis={{ tooltip: text }}>
                {text || '-'}
            </Typography.Text>
        ),
        sorter: true, // Açıklamaya göre de sıralama yapılsın
    },
    {
        title: 'Tutar',
        dataIndex: 'amount',
        key: 'amount',
        align: 'right',
        render: (amount, record) => {
            // Ant Design'ın render fonksiyonu ikinci parametre olarak satırın tüm verisini verir.
            // Bu sayede record.currency ile o satırın para birimini alabiliriz.
            return formatCurrency(amount, record.currency);
        },
        width: 160,
        sorter: true,
    },
];

const IncomeExpenseTab = () => {
    const [loading, setLoading] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [pagination, setPagination] = useState({ current_page: 1, total_items: 0 });
    const [summary, setSummary] = useState({ income: 0, expense: 0, net: 0 });
    const [filters, setFilters] = useState({
        searchText: '',
        categories: [],
        dateRange: [dayjs().subtract(7, 'day'), dayjs()],
    });
    // Sıralama bilgilerini tutmak için yeni state
    const [sorter, setSorter] = useState({ field: 'date', order: 'descend' });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const params = {
                    page: pagination.current_page,
                    per_page: 15,
                    startDate: filters.dateRange ? filters.dateRange[0].format('YYYY-MM-DD') : undefined,
                    endDate: filters.dateRange ? filters.dateRange[1].format('YYYY-MM-DD') : undefined,
                    categories: filters.categories.length > 0 ? filters.categories.join(',') : undefined,
                    q: filters.searchText || undefined,
                    sort_by: sorter.field,
                    sort_order: sorter.order === 'ascend' ? 'asc' : 'desc',
                };

                const response = await getTransactions(params);
                setTransactions(response.data);
                setPagination(response.pagination);
                
                const currentSummary = response.data.reduce((acc, item) => {
                    if (item.category?.includes('Gelir')) {
                        acc.income += parseFloat(item.amount);
                    }
                    if (item.category?.includes('Gider') || item.category?.includes('Harcama')) {
                        acc.expense += parseFloat(item.amount);
                    }
                    return acc;
                }, { income: 0, expense: 0 });
                currentSummary.net = currentSummary.income - currentSummary.expense;
                setSummary(currentSummary);

            } catch (error) {
                message.error("İşlemler yüklenirken bir hata oluştu!");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [filters, pagination.current_page, sorter]);

    const handleFilterChange = (key, value) => {
        setPagination(p => ({ ...p, current_page: 1 }));
        setFilters(prev => ({ ...prev, [key]: value }));
    };
    
    // handleTableChange artık sıralamayı da yönetiyor.
    const handleTableChange = (pagination, tableFilters, newSorter) => {
        setPagination(prev => ({ ...prev, current_page: pagination.current }));
        if (newSorter.field && newSorter.order) {
            setSorter({ field: newSorter.field, order: newSorter.order });
        } else {
            setSorter({ field: 'date', order: 'descend' });
        }
    };

    return (
        <div>
            <Collapse defaultActiveKey={['1']} ghost className="summary-panel">
                <Panel header={ <span style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}> <FundViewOutlined /> Filtreye Göre Dönem Özeti (Görünen Sayfa) </span> } key="1">
                    <Row gutter={16}>
                        <Col xs={24} sm={8}><Card size="small"><Statistic title="Toplam Gelir" value={summary.income} precision={2} prefix={<RiseOutlined />} suffix="TRY" valueStyle={{ color: '#3f8600' }} /></Card></Col>
                        <Col xs={24} sm={8}><Card size="small"><Statistic title="Toplam Gider" value={summary.expense} precision={2} prefix={<FallOutlined />} suffix="TRY" valueStyle={{ color: '#cf1322' }} /></Card></Col>
                        <Col xs={24} sm={8}><Card size="small"><Statistic title="Net Durum" value={summary.net} precision={2} prefix={<SwapOutlined />} suffix="TRY" /></Card></Col>
                    </Row>
                </Panel>
            </Collapse>

            <Card className="filter-panel">
                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={8}> <Search placeholder="Müşteri, satıcı, kart adı ara..." onSearch={(value) => handleFilterChange('searchText', value)} allowClear enterButton /> </Col>
                    <Col xs={24} lg={8}> <RangePicker style={{ width: '100%' }} value={filters.dateRange} onChange={(dates) => handleFilterChange('dateRange', dates)} /> </Col>
                    <Col xs={24} lg={8}> <Select mode="multiple" allowClear style={{ width: '100%' }} placeholder="Kategori seçin..." onChange={(values) => handleFilterChange('categories', values)}> {transactionCategories.map(cat => <Option key={cat}>{cat}</Option>)} </Select> </Col>
                </Row>
            </Card>

            <Table
                columns={columns}
                dataSource={transactions}
                loading={loading}
                rowKey="id"
                pagination={{
                    current: pagination.current_page,
                    pageSize: 15,
                    total: pagination.total_items,
                }}
                onChange={handleTableChange}
                locale={{ emptyText: <Empty description="Filtreye uygun işlem bulunamadı." /> }}
            />
        </div>
    );
};

export default IncomeExpenseTab;