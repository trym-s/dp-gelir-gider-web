import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Table, Typography, Button, Input, DatePicker, Row, Col, message, Spin, Alert, Tag, Modal, Collapse, Tabs, Tooltip, Select } from "antd";
import { PlusOutlined, FilterOutlined, UploadOutlined, SaveOutlined, DownloadOutlined } from "@ant-design/icons";
import { useDebounce } from "../../hooks/useDebounce";
import { getIncomes, createIncome, uploadIncomesExcel, importValidatedIncomes } from "../../api/incomeService";
import { useIncomeDetail } from '../../context/IncomeDetailContext';
import { useExcelImport } from '../../hooks/useExcelImport';
import { useDropdownData } from '../../hooks/useDropdownData';
import GelirForm from "./components/GelirForm";
import styles from './IncomeList.module.css';
import dayjs from "dayjs";
import { api } from '../../api/api';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Panel } = Collapse;
const { TabPane } = Tabs;
const { Option } = Select;

const getStatusTag = (status) => {
    const statusMap = {
        'RECEIVED': { color: 'green', text: 'Tahsil Edildi' },
        'UNRECEIVED': { color: 'red', text: 'Edilmedi' },
        'PARTIALLY_RECEIVED': { color: 'orange', text: 'Kısmi Tahsil' },
        'OVER_RECEIVED': { color: 'purple', text: 'Fazla Tahsil' },
    };
    const { color, text } = statusMap[status] || { color: 'default', text: status };
    return <Tag color={color}>{text}</Tag>;
};

const getRowClassName = (record) => {
    switch (record.status) {
        case 'RECEIVED': return 'row-is-complete';
        case 'PARTIALLY_RECEIVED': return 'row-is-partial';
        case 'UNRECEIVED': return 'row-is-danger';
        default: return '';
    }
};

export default function IncomeList() {
    const [incomes, setIncomes] = useState([]);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    const [filters, setFilters] = useState({});
    const [sortInfo, setSortInfo] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isNewModalVisible, setIsNewModalVisible] = useState(false);

    const { openIncomeModal } = useIncomeDetail();
    const debouncedSearchTerm = useDebounce(filters.invoice_name, 500);

    // BU DİZİ ÇOK ÖNEMLİ: 'customer_name' İÇERMELİ
    const incomeExpectedKeys = [
        'invoice_name', 'invoice_number', 'issue_date', 'total_amount',
        'customer_id', 'region_id', 'account_name_id', 'budget_item_id',
        'customer_name', 'is_new_customer'
    ];

    const { isUploadModalVisible, uploadResults, editableRows, activeTab, loading: importLoading, handleExcelUpload, handleCellChange, handleSaveImports, closeUploadModal, setActiveTab } = useExcelImport(
        uploadIncomesExcel,
        importValidatedIncomes,
        incomeExpectedKeys,
        () => refreshIncomes()
    );
    
    const { customers, regions, accountNames, budgetItems } = useDropdownData();

    const refreshIncomes = useCallback(() => {
        setLoading(true);
        setError(null);
        const params = {
            page: pagination.current, per_page: pagination.pageSize,
            invoice_name: debouncedSearchTerm, date_start: filters.date_start, date_end: filters.date_end,
            sort_by: sortInfo.field, sort_order: sortInfo.order === 'ascend' ? 'asc' : 'desc',
        };
        Object.keys(params).forEach(key => { if (!params[key]) delete params[key]; });

        getIncomes(params)
            .then(response => {
                setIncomes(response.data);
                setPagination(prev => ({ ...prev, current: response.pagination.current_page, total: response.pagination.total_items }));
            })
            .catch(() => setError("Gelirler yüklenirken bir hata oluştu."))
            .finally(() => setLoading(false));
    }, [pagination.current, pagination.pageSize, debouncedSearchTerm, filters.date_start, filters.date_end, sortInfo]);

    useEffect(() => {
        refreshIncomes();
    }, [refreshIncomes]);

    const handleTableChange = (pagination, filters, sorter) => {
        setPagination(prev => ({ ...prev, current: pagination.current, pageSize: pagination.pageSize }));
        setSortInfo({ field: sorter.field, order: sorter.order });
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleCreate = async (values) => {
        setLoading(true);
        try {
            await createIncome(values);
            message.success("Yeni gelir başarıyla eklendi.");
            setIsNewModalVisible(false);
            refreshIncomes();
        } catch (err) {
            message.error("Yeni gelir eklenirken bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };
    
    const mainColumns = [
        { title: "Fatura No", dataIndex: "invoice_number", key: "invoice_number", sorter: true },
        { title: "Fatura İsmi", dataIndex: "invoice_name", key: "invoice_name", sorter: true, ellipsis: true },
        { title: "Müşteri", dataIndex: ["customer", "name"], key: "customer" },
        { title: "Toplam Tutar", dataIndex: "total_amount", key: "total_amount", sorter: true, align: 'right', render: (val) => `${val} ₺` },
        { title: "Tahsil Edilen", dataIndex: "received_amount", key: "received_amount", sorter: true, align: 'right', render: (val) => `${val} ₺` },
        { title: "Durum", dataIndex: "status", key: "status", sorter: true, render: getStatusTag },
        { title: "Düzenleme Tarihi", dataIndex: "issue_date", key: "issue_date", sorter: true, render: (val) => dayjs(val).format('DD/MM/YYYY') },
    ];

    const editableUploadColumns = [
        { title: 'Satır', dataIndex: 'row', key: 'row', width: 70, fixed: 'left' },
        { title: 'Fatura İsmi', dataIndex: 'invoice_name', key: 'invoice_name', width: 250 },
        { 
          title: 'Fatura No', dataIndex: 'invoice_number', key: 'invoice_number', width: 180,
          render: (text, record) => <Input defaultValue={text} disabled={record.errors?.invoice_number} status={record.errors?.invoice_number ? 'error' : ''} />
        },
        { 
          title: 'Tarih', dataIndex: 'issue_date', key: 'issue_date', width: 150,
          render: (text, record) => <Input defaultValue={dayjs(text).format('DD.MM.YYYY')} onChange={(e) => handleCellChange(record.key, 'issue_date', e.target.value)} />
        },
        {
            title: 'Müşteri', dataIndex: 'customer_id', key: 'customer_id', width: 220,
            render: (text, record) => {
                if (record.is_new_customer) {
                    return <Tooltip title="Bu müşteri yeni oluşturulacak"><span>{record.customer_name} <Tag color="blue">Yeni</Tag></span></Tooltip>;
                }
                return (
                    <Select defaultValue={text} status={record.errors?.customer_id ? 'error' : ''} onChange={(value) => handleCellChange(record.key, 'customer_id', value)} style={{ width: '100%' }} showSearch optionFilterProp="children" >
                        {customers.map(item => <Option key={item.id} value={item.id}>{item.name}</Option>)}
                    </Select>
                );
            }
        },
        { title: 'Toplam Tutar', dataIndex: 'total_amount', key: 'total_amount', width: 120, render: (text, record) => <Input defaultValue={text} onChange={(e) => handleCellChange(record.key, 'total_amount', e.target.value)} /> },
        { title: 'Bölge', dataIndex: 'region_id', key: 'region_id', width: 170, render: (text, record) => (<Select placeholder="Seçim Yapın" defaultValue={text} onChange={(value) => handleCellChange(record.key, 'region_id', value)} style={{ width: '100%' }}>{regions.map(item => <Option key={item.id} value={item.id}>{item.name}</Option>)}</Select>) },
        { title: 'Hesap Adı', dataIndex: 'account_name_id', key: 'account_name_id', width: 170, render: (text, record) => (<Select placeholder="Seçim Yapın" defaultValue={text} onChange={(value) => handleCellChange(record.key, 'account_name_id', value)} style={{ width: '100%' }}>{accountNames.map(item => <Option key={item.id} value={item.id}>{item.name}</Option>)}</Select>) },
        { title: 'Bütçe Kalemi', dataIndex: 'budget_item_id', key: 'budget_item_id', width: 170, render: (text, record) => (<Select placeholder="Seçim Yapın" defaultValue={text} onChange={(value) => handleCellChange(record.key, 'budget_item_id', value)} style={{ width: '100%' }}>{budgetItems.map(item => <Option key={item.id} value={item.id}>{item.name}</Option>)}</Select>) },
    ];

    return (
        <div style={{ padding: 24 }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                <Title level={3} style={{ margin: 0 }}>Gelir Listesi</Title>
                <div>
                    <Button icon={<DownloadOutlined />} onClick={() => window.location.href = `${api.defaults.baseURL}/incomes/download-template`} style={{ marginRight: 8 }}>Taslak İndir</Button>
                    <Upload customRequest={handleExcelUpload} showUploadList={false} accept=".xlsx, .xls">
                        <Button icon={<UploadOutlined />}>Excel ile Yükle</Button>
                    </Upload>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsNewModalVisible(true)} style={{ marginLeft: 8 }}>Yeni Gelir</Button>
                </div>
            </Row>

            <Collapse ghost>
                <Panel header={<><FilterOutlined /> Filtrele & Ara</>} key="1">
                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12}><Input.Search placeholder="Açıklamada ara..." allowClear onSearch={(value) => handleFilterChange('invoice_name', value)} onChange={(e) => handleFilterChange('invoice_name', e.target.value)} /></Col>
                        <Col xs={24} sm={12}><RangePicker style={{ width: "100%" }} onChange={(dates) => { handleFilterChange('date_start', dates ? dayjs(dates[0]).format('YYYY-MM-DD') : null); handleFilterChange('date_end', dates ? dayjs(dates[1]).format('YYYY-MM-DD') : null); }} format="DD/MM/YYYY" /></Col>
                    </Row>
                </Panel>
            </Collapse>

            {error && <Alert message={error} type="error" style={{ margin: '16px 0' }} showIcon />}

            <Spin spinning={loading}>
                <Table className={styles.modernTable} columns={mainColumns} dataSource={incomes} rowKey="id" pagination={pagination} onChange={handleTableChange} rowClassName={getRowClassName} onRow={(record) => ({ onClick: () => openIncomeModal(record.id), style: { cursor: "pointer" } })} />
            </Spin>

            <Modal title="Yeni Gelir Ekle" open={isNewModalVisible} onCancel={() => setIsNewModalVisible(false)} destroyOnClose footer={null} width={800}>
                <GelirForm onFinish={handleCreate} onCancel={() => setIsNewModalVisible(false)} />
            </Modal>

            <Modal title="Gelir Excel Yükleme Sonuçları" open={isUploadModalVisible} onCancel={closeUploadModal} width={1200}
                footer={[<Button key="back" onClick={closeUploadModal}>Kapat</Button>, <Button key="submit" type="primary" loading={importLoading} onClick={handleSaveImports} icon={<SaveOutlined />}>Doldurulanları İçe Aktar</Button>]}>
                <Tabs activeKey={activeTab} onChange={setActiveTab}>
                    <TabPane tab={`Düzenlenecek Satırlar (${uploadResults.invalid.length})`} key="invalid">
                        <Alert message="Lütfen eksik alanları (Bölge, Hesap Adı, Bütçe Kalemi) doldurun ve 'Doldurulanları İçe Aktar' butonuna basın. Yeni müşteriler otomatik olarak oluşturulacaktır." type="info" showIcon style={{ marginBottom: 16 }} />
                        <Table columns={editableUploadColumns} dataSource={editableRows} pagination={{ pageSize: 5 }} rowKey="key" scroll={{ x: 1200 }} />
                    </TabPane>
                </Tabs>
            </Modal>
        </div>
    );
}