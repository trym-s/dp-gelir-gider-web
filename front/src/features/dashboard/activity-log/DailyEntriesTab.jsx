// src/features/dashboard/activity-log/DailyEntriesTab.jsx

import React, { useState, useEffect } from 'react';
import { Table, DatePicker, Row, Col, Tag, Spin, Typography, Card, Input, Select, message } from 'antd';
import dayjs from 'dayjs';
import { getDailyEntries } from '../../../api/transactionService'; 

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const dailyEntryCategories = ['Banka Bakiye', 'KMH Limiti', 'Kredi Kartı Limiti'];

// Sütunlara 'sorter: true' ve backend ile eşleşen 'key'ler eklendi
const columns = [
    {
        title: 'Gün',
        dataIndex: 'date',
        key: 'date',
        render: (text) => dayjs(text).format('DD.MM.YYYY'),
        width: 120,
        sorter: true,
    },
    {
        title: 'Vakit',
        dataIndex: 'period',
        key: 'period',
        render: (text) => {
            const color = text === 'Akşam' ? 'purple' : 'cyan';
            return <Tag color={color}>{text}</Tag>;
        },
        width: 100,
        sorter: true,
    },
    {
        title: 'Kategori',
        dataIndex: 'category',
        key: 'category',
        render: (text) => <Tag color="blue">{text}</Tag>,
        width: 180,
        sorter: true,
    },
    {
        title: 'Banka Adı',
        dataIndex: 'bank_name',
        key: 'bank_name',
        sorter: true,
    },
    {
        title: 'Hesap Adı',
        dataIndex: 'account_name',
        key: 'account_name',
        sorter: true,
    },
    {
        title: 'Miktar / Değer',
        dataIndex: 'amount',
        key: 'amount',
        align: 'right',
        render: (amount) => (amount ? parseFloat(amount) : 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }),
        width: 160,
        sorter: true,
    }
];

const DailyEntriesTab = () => {
    const [loading, setLoading] = useState(false);
    const [entries, setEntries] = useState([]);
    const [pagination, setPagination] = useState({ current_page: 1, total_items: 0 });
    const [filters, setFilters] = useState({
        dateRange: [dayjs().subtract(7, 'day'), dayjs()],
        searchText: '',
        categories: [],
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
                
                const response = await getDailyEntries(params);
                setEntries(response.data);
                setPagination(response.pagination);

            } catch (error) {
                message.error("Günlük girişler yüklenirken bir hata oluştu!");
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
            <Card style={{ marginBottom: 24, backgroundColor: '#fafafa' }}>
                <Row gutter={[16, 16]} align="bottom">
                    <Col xs={24} lg={8}> <Search placeholder="Banka, hesap adı ara..." onSearch={(value) => handleFilterChange('searchText', value)} allowClear enterButton /> </Col>
                    <Col xs={24} lg={8}> <RangePicker style={{ width: '100%' }} value={filters.dateRange} onChange={(dates) => handleFilterChange('dateRange', dates)} /> </Col>
                    <Col xs={24} lg={8}> <Select mode="multiple" allowClear style={{ width: '100%' }} placeholder="Kategori seçin..." onChange={(values) => handleFilterChange('categories', values)}> {dailyEntryCategories.map(cat => <Option key={cat}>{cat}</Option>)} </Select> </Col>
                </Row>
            </Card>

            <div style={{ marginBottom: 16, textAlign: 'right' }}>
                <Title level={5}> Bulunan Kayıt Sayısı: <Tag color="green" style={{ fontSize: '1rem', padding: '4px 8px' }}>{pagination.total_items}</Tag> </Title>
            </div>

            <Table
                columns={columns}
                dataSource={entries}
                loading={loading}
                rowKey="id"
                pagination={{
                    current: pagination.current_page,
                    pageSize: 15,
                    total: pagination.total_items,
                }}
                onChange={handleTableChange}
            />
        </div>
    );
};

export default DailyEntriesTab;