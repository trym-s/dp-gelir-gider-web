import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Table, Typography, Button, Input, DatePicker, Row, Col, message, Spin, Alert, Tag, Modal, Collapse, Tabs, Tooltip, Select } from "antd";
import { PlusOutlined, FilterOutlined, UploadOutlined, SaveOutlined, DownloadOutlined } from "@ant-design/icons";
import { useDebounce } from "../../hooks/useDebounce";
import { getExpenses, createExpense, createExpenseGroup, uploadExpensesExcel, importValidatedExpenses } from "../../api/expenseService";
import { useExpenseDetail } from '../../context/ExpenseDetailContext';
import { useExcelImport } from '../../hooks/useExcelImport'; // Excel işlemleri için hook
import { useDropdownData } from '../../hooks/useDropdownData'; // Açılır liste verileri için hook
import ExpenseForm from "./components/ExpenseForm";
import styles from './ExpenseList.module.css';
import dayjs from "dayjs";
import { api } from '../../api/api';
import PermissionGate from '../../components/PermissionGate'

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Panel } = Collapse;
const { TabPane } = Tabs;
const { Option } = Select;

// === Yardımcı Fonksiyonlar ===
const getStatusTag = (status) => {
    const statusMap = {
        'PAID': { color: 'green', text: 'Ödendi' }, 'UNPAID': { color: 'red', text: 'Ödenmedi' },
        'PARTIALLY_PAID': { color: 'orange', text: 'Kısmi Ödendi' }, 'OVERPAID': { color: 'purple', text: 'Fazla Ödendi' },
    };
    const { color, text } = statusMap[status] || { color: 'default', text: status };
    return <Tag color={color}>{text}</Tag>;
};

const getRowClassName = (record) => {
    switch (record.status) {
        case 'PAID': return 'row-is-complete';
        case 'PARTIALLY_PAID': return 'row-is-partial';
        case 'UNPAID': return 'row-is-danger';
        default: return '';
    }
};

// === Ana Component ===
export default function ExpenseList() {
    // === State Tanımlamaları ===
    const [expenses, setExpenses] = useState([]);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    const [filters, setFilters] = useState({});
    const [sortInfo, setSortInfo] = useState({});
    const [loading, setLoading] = useState(true); // Tüm yükleme durumları için tek state
    const [error, setError] = useState(null);
    const [isNewModalVisible, setIsNewModalVisible] = useState(false);

    // === Custom Hook'lar ===
    const { openExpenseModal } = useExpenseDetail();
    const debouncedSearchTerm = useDebounce(filters.description, 500);


    const expenseExpectedKeys = [
      'description', 'amount', 'date', 'region_id', 
      'payment_type_id', 'account_name_id', 'budget_item_id'
    ];
    
    // Excel import mantığını ve state'lerini hook'tan al
    const { isUploadModalVisible, uploadResults, editableRows, activeTab, loading: importLoading, handleExcelUpload, handleCellChange, handleSaveImports, closeUploadModal, setActiveTab } = useExcelImport(
    uploadExpensesExcel,
    importValidatedExpenses,
    expenseExpectedKeys, // <-- YENİ PARAMETRE
    () => refreshExpenses()
    );
    // Hata düzeltme modalındaki açılır listeler için verileri çek
    const { regions, paymentTypes, accountNames, budgetItems } = useDropdownData();

    // === Veri Çekme Fonksiyonu ===
    const refreshExpenses = useCallback(() => {
        setLoading(true);
        setError(null);
        const params = {
            page: pagination.current, per_page: pagination.pageSize,
            description: debouncedSearchTerm, date_start: filters.date_start, date_end: filters.date_end,
            sort_by: sortInfo.field, sort_order: sortInfo.order === 'ascend' ? 'asc' : 'desc',
        };
        Object.keys(params).forEach(key => { if (!params[key]) delete params[key]; });

        getExpenses(params)
            .then(response => {
                setExpenses(response.data);
                setPagination(prev => ({ ...prev, current: response.pagination.current_page, total: response.pagination.total_items }));
            })
            .catch(() => setError("Giderler yüklenirken bir hata oluştu."))
            .finally(() => setLoading(false));
    }, [pagination.current, pagination.pageSize, debouncedSearchTerm, filters.date_start, filters.date_end, sortInfo]);

    useEffect(() => {
        refreshExpenses();
    }, [refreshExpenses]);

    // === Handler Fonksiyonları ===
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
            if (values.isGroup) {
                const groupPayload = { /* ... */ }; // Grup verisi
                await createExpenseGroup(groupPayload);
                message.success("Gider grubu başarıyla oluşturuldu.");
            } else {
                await createExpense(values);
                message.success("Yeni gider başarıyla eklendi.");
            }
            setIsNewModalVisible(false);
            refreshExpenses();
        } catch (err) {
            message.error("Yeni gider veya grup eklenirken bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    // === Sütun Tanımları ===
    const mainColumns = [
        { title: "Açıklama", dataIndex: "description", key: "description", ellipsis: true },
        { title: "Bölge", dataIndex: ["region", "name"], key: "region" },
        { title: "Ödeme Türü", dataIndex: ["payment_type", "name"], key: "payment_type" },
        { title: "Hesap Adı", dataIndex: ["account_name", "name"], key: "account_name" },
        { title: "Bütçe Kalemi", dataIndex: ["budget_item", "name"], key: "budget_item" },
        { title: "Tutar", dataIndex: "amount", key: "amount", sorter: true, align: 'right', render: (val) => `${val} ₺` },
        { title: "Kalan Tutar", dataIndex: "remaining_amount", key: "remaining_amount", align: 'right', render: (val) => `${val} ₺` },
        { title: "Durum", dataIndex: "status", key: "status", sorter: true, render: getStatusTag },
        { title: "Tarih", dataIndex: "date", key: "date", sorter: true, render: (val) => dayjs(val).format('DD/MM/YYYY') },
    ];

    const editableUploadColumns = [
    { title: 'Satır', dataIndex: 'key', key: 'row', width: 80, fixed: 'left' },
    { 
        title: 'Açıklama', dataIndex: 'description', key: 'description', width: 200,
        render: (text, record) => (<Tooltip title={record.errors?.description}><Input defaultValue={text} status={record.errors?.description ? 'error' : ''} onChange={(e) => handleCellChange(record.key, 'description', e.target.value)} /></Tooltip>)
    },
    { 
        title: 'Tutar', dataIndex: 'amount', key: 'amount', width: 120,
        render: (text, record) => (<Tooltip title={record.errors?.amount}><Input defaultValue={text} status={record.errors?.amount ? 'error' : ''} onChange={(e) => handleCellChange(record.key, 'amount', e.target.value)} /></Tooltip>)
    },
    { 
        title: 'Tarih', dataIndex: 'date', key: 'date', width: 150,
        render: (text, record) => (<Tooltip title={record.errors?.date}><Input defaultValue={text} placeholder="GG.AA.YYYY" status={record.errors?.date ? 'error' : ''} onChange={(e) => handleCellChange(record.key, 'date', e.target.value)} /></Tooltip>)
    },
    { 
        title: 'Bölge', dataIndex: 'region_id', key: 'region_id', width: 150,
        // Gelen verideki 'region_id'yi defaultValue olarak kullan
        render: (text, record) => (<Tooltip title={record.errors?.region_id}><Select defaultValue={record.region_id} status={record.errors?.region_id ? 'error' : ''} onChange={(value) => handleCellChange(record.key, 'region_id', value)} style={{ width: '100%' }}>{regions.map(item => <Option key={item.id} value={item.id}>{item.name}</Option>)}</Select></Tooltip>)
    },
    { 
        title: 'Ödeme Türü', dataIndex: 'payment_type_id', key: 'payment_type_id', width: 150,
        render: (text, record) => (<Tooltip title={record.errors?.payment_type_id}><Select defaultValue={record.payment_type_id} status={record.errors?.payment_type_id ? 'error' : ''} onChange={(value) => handleCellChange(record.key, 'payment_type_id', value)} style={{ width: '100%' }}>{paymentTypes.map(item => <Option key={item.id} value={item.id}>{item.name}</Option>)}</Select></Tooltip>)
    },
    { 
        title: 'Hesap Adı', dataIndex: 'account_name_id', key: 'account_name_id', width: 150,
        render: (text, record) => (<Tooltip title={record.errors?.account_name_id}><Select defaultValue={record.account_name_id} status={record.errors?.account_name_id ? 'error' : ''} onChange={(value) => handleCellChange(record.key, 'account_name_id', value)} style={{ width: '100%' }}>{accountNames.map(item => <Option key={item.id} value={item.id}>{item.name}</Option>)}</Select></Tooltip>)
    },
    { 
        title: 'Bütçe Kalemi', dataIndex: 'budget_item_id', key: 'budget_item_id', width: 150,
        render: (text, record) => (<Tooltip title={record.errors?.budget_item_id}><Select defaultValue={record.budget_item_id} status={record.errors?.budget_item_id ? 'error' : ''} onChange={(value) => handleCellChange(record.key, 'budget_item_id', value)} style={{ width: '100%' }}>{budgetItems.map(item => <Option key={item.id} value={item.id}>{item.name}</Option>)}</Select></Tooltip>)
    },
];

    // === JSX Render ===
    return (
        <div style={{ padding: 24 }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                <Title level={3} style={{ margin: 0 }}>Gider Listesi</Title>
                <div>
                    <Button icon={<DownloadOutlined />} onClick={() => window.location.href = `${api.defaults.baseURL}/expenses/download-template`} style={{ marginRight: 8 }}>Taslak İndir</Button>
                    <Upload customRequest={handleExcelUpload} showUploadList={false}>
                        <Button icon={<UploadOutlined />}>Excel ile Yükle</Button>
                    </Upload>
                    <PermissionGate permission="expense:create">
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsNewModalVisible(true)} style={{ marginLeft: 8 }}>Yeni Gider</Button>
                    </PermissionGate>
                </div>
            </Row>

            <Collapse ghost>
                <Panel header={<><FilterOutlined /> Filtrele & Ara</>} key="1">
                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12}><Input.Search placeholder="Açıklamada ara..." allowClear onSearch={(value) => handleFilterChange('description', value)} onChange={(e) => handleFilterChange('description', e.target.value)}/></Col>
                        <Col xs={24} sm={12}><RangePicker style={{ width: "100%" }} onChange={(dates) => { handleFilterChange('date_start', dates ? dayjs(dates[0]).format('YYYY-MM-DD') : null); handleFilterChange('date_end', dates ? dayjs(dates[1]).format('YYYY-MM-DD') : null); }} format="DD/MM/YYYY" /></Col>
                    </Row>
                </Panel>
            </Collapse>

            {error && <Alert message={error} type="error" style={{ margin: '16px 0' }} showIcon />}

            <Spin spinning={loading}>
                <Table className={styles.modernTable} columns={mainColumns} dataSource={expenses} rowKey="id" pagination={pagination} onChange={handleTableChange} rowClassName={getRowClassName} onRow={(record) => ({ onClick: () => openExpenseModal(record.id), style: { cursor: "pointer" } })} />
            </Spin>

            <Modal title="Yeni Gider Ekle" open={isNewModalVisible} onCancel={() => setIsNewModalVisible(false)} destroyOnClose footer={null}>
                <ExpenseForm onFinish={handleCreate} onCancel={() => setIsNewModalVisible(false)} />
            </Modal>

            <Modal title="Excel Yükleme Sonuçları" open={isUploadModalVisible} onCancel={closeUploadModal} width={1200}
                footer={[ <Button key="back" onClick={closeUploadModal}>Kapat</Button>, <Button key="submit" type="primary" loading={importLoading} onClick={handleSaveImports} icon={<SaveOutlined />}>Düzeltilenleri İçe Aktar</Button> ]}>
                <Tabs activeKey={activeTab} onChange={setActiveTab}>
                    <TabPane tab={`Hatalı Satırlar (${uploadResults.invalid.length})`} key="invalid" disabled={uploadResults.invalid.length === 0}>
                        <Alert message="Lütfen hatalı alanları düzeltip 'İçe Aktar' butonuna basın." type="warning" showIcon style={{marginBottom: 16}}/>
                        <Table columns={editableUploadColumns} dataSource={editableRows} pagination={false} rowKey="key" scroll={{ x: 1200 }}/>
                    </TabPane>
                    <TabPane tab={`Geçerli Satırlar (${uploadResults.valid.length})`} key="valid">
                        <Alert message="Bu satırlar sorunsuz bir şekilde içe aktarılmaya hazır." type="success" showIcon style={{marginBottom: 16}}/>
                        <Table columns={[{ title: 'Satır', dataIndex: 'row', key: 'row' }, { title: 'Açıklama', dataIndex: ['data', 'description'], key: 'description' }, { title: 'Tutar', dataIndex: ['data', 'amount'], key: 'amount' },]} dataSource={uploadResults.valid} pagination={false} rowKey="row"/>
                    </TabPane>
                </Tabs>
            </Modal>
        </div>
    );
}