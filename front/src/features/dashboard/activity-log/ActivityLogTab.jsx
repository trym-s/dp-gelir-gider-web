import React, { useState, useEffect, useCallback } from 'react';
import { Card, Input, Select, DatePicker, Table, Tag, Spin, Empty, Typography, message, Row, Col } from 'antd';
import dayjs from 'dayjs';
import { getAllActivities } from '../../../api/transactionService';
import { formatCurrency } from '../../../utils/formatting';

const { Search } = Input;
const { RangePicker } = DatePicker;
const { Option } = Select;

const activityCategories = [ 'Gelir Eklendi', 'Gider Eklendi', 'Kredi Kartı Eklendi', 'Kredi Eklendi' ];

// SÜTUNLAR İSTEKLERİNİZE GÖRE SON KEZ GÜNCELLENDİ
const columns = [
    { title: 'Tarih', dataIndex: 'event_date', key: 'event_date', render: (text) => dayjs(text).format('DD.MM.YYYY HH:mm'), width: 150, sorter: true },
    {
        title: 'Kategori', dataIndex: 'category', key: 'category',
        render: (category) => {
            let color = 'default';
            if (category?.includes('Gelir')) color = 'success';
            if (category?.includes('Gider')) color = 'error';
            if (category?.includes('Kredi')) color = 'processing';
            return <Tag color={color}>{category?.toUpperCase() || 'BİLİNMİYOR'}</Tag>;
        }, width: 180, sorter: true,
    },
    { title: 'Bölge', dataIndex: 'region', key: 'region', render: (text) => text || '-', width: 120 },
    { title: 'İsim', dataIndex: 'bank_or_company', key: 'bank_or_company', render: (text) => text || '-', sorter: true },
    {
        title: 'Tutar / Limit', dataIndex: 'amount', key: 'amount', align: 'right',
        render: (amount, record) => {
        if (amount === null || amount === undefined) return '-';
        // record.currency ile o satırın para birimini alıyoruz
        return formatCurrency(amount, record.currency);
        }, width: 160, sorter: true,
    },
];

const ActivityLogTab = () => {
    const [loading, setLoading] = useState(false);
    const [activities, setActivities] = useState([]);
    const [pagination, setPagination] = useState({ current_page: 1, total_items: 0 });
    const [filters, setFilters] = useState({ searchText: '', categories: [], dateRange: [dayjs().subtract(7, 'day'), dayjs()] });
    const [sorter, setSorter] = useState({ field: 'event_date', order: 'descend' });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.current_page, per_page: 15,
                startDate: filters.dateRange ? filters.dateRange[0].format('YYYY-MM-DD') : undefined,
                endDate: filters.dateRange ? filters.dateRange[1].format('YYYY-MM-DD') : undefined,
                categories: filters.categories.length > 0 ? filters.categories.join(',') : undefined,
                q: filters.searchText || undefined,
                sort_by: sorter.field,
                sort_order: sorter.order === 'ascend' ? 'asc' : 'desc',
            };
            const response = await getAllActivities(params);
            setActivities(response.data);
            setPagination(response.pagination);
        } catch (error) { message.error("Sistem olayları yüklenirken bir hata oluştu!"); }
        finally { setLoading(false); }
    }, [pagination.current_page, filters, sorter]);

    useEffect(() => { fetchData(); }, [fetchData]);
    
    const handleFilterChange = (key, value) => {
        setPagination(p => ({ ...p, current_page: 1 }));
        setFilters(prev => ({ ...prev, [key]: value }));
    };
    
    const handleTableChange = (pagination, tableFilters, newSorter) => {
        setPagination(prev => ({ ...prev, current_page: pagination.current }));
        setSorter({ field: newSorter.field || 'event_date', order: newSorter.order || 'descend' });
    };

    return (
        <div>
            <Card className="filter-panel" style={{ marginBottom: 16 }}>
                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={8}> <Search placeholder="Banka, şirket ara..." onSearch={(value) => handleFilterChange('searchText', value)} allowClear enterButton /> </Col>
                    <Col xs={24} lg={8}> <RangePicker style={{ width: '100%' }} value={filters.dateRange} onChange={(dates) => handleFilterChange('dateRange', dates)} /> </Col>
                    <Col xs={24} lg={8}> <Select mode="multiple" allowClear style={{ width: '100%' }} placeholder="Kategori seçin..." onChange={(values) => handleFilterChange('categories', values)}> {activityCategories.map(cat => <Option key={cat}>{cat}</Option>)} </Select> </Col>
                </Row>
            </Card>

            <Table
                columns={columns}
                dataSource={activities}
                loading={loading}
                rowKey="id"
                pagination={{ current: pagination.current_page, pageSize: 15, total: pagination.total_items, }}
                onChange={handleTableChange}
                locale={{ emptyText: <Empty description="Filtreye uygun olay bulunamadı." /> }}
            />
        </div>
    );
};
export default ActivityLogTab;