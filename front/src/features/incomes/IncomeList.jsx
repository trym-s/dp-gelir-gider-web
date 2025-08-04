// front/src/features/incomes/IncomeList.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { Form, Space, Upload, Table, Typography, Button, Input, DatePicker, Row, Col, message, Spin, Alert, Tag, Modal, Collapse, Tabs, Tooltip, Select } from "antd";
import { PlusOutlined, FilterOutlined, UploadOutlined, SaveOutlined, DownloadOutlined } from "@ant-design/icons";
import { useDebounce } from "../../hooks/useDebounce";
import { getIncomes, createIncome, uploadIncomesExcel, importValidatedIncomes, uploadDubaiIncomesExcel } from "../../api/incomeService";
import { useIncomeDetail } from '../../context/IncomeDetailContext';
import { useExcelImport } from '../../hooks/useExcelImport';
import  useDropdownData  from '../../hooks/useDropdownData';
import IncomeForm from "./components/IncomeForm";
import styles from './IncomeList.module.css';
import dayjs from "dayjs";
import { api } from '../../api/api';
import PermissionGate from '../../components/PermissionGate';

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

const getTimelinessStatusTag = (status) => {
    if (!status) return null;
    const statusMap = {
        'EARLY': { color: 'blue', text: 'Erken Ödendi' },
        'ON_TIME': { color: 'green', text: 'Vaktinde Ödendi' },
        'LATE': { color: 'volcano', text: 'Geç Ödendi' },
    };
    const { color, text } = statusMap[status] || { color: 'default', text: status };
    return <Tag color={color}>{text}</Tag>;
};

const duplicateColumns = [
    { title: 'Satır', dataIndex: 'row', key: 'row' },
    { title: 'Fatura İsmi', dataIndex: ['data', 'invoice_name'], key: 'invoice_name' },
    { title: 'Fatura No', dataIndex: ['data', 'invoice_number'], key: 'invoice_number' },
    { title: 'Hata', dataIndex: 'errors', key: 'errors', render: (errors) => <Tag color="red">{errors?.invoice_number || 'Tekrarlanan Kayıt'}</Tag> },
];

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
    const [filterForm] = Form.useForm();

    const refreshIncomes = useCallback(() => {
        setLoading(true);
        setError(null);

        const params = {
            page: pagination.current, per_page: pagination.pageSize,
            invoice_name: debouncedSearchTerm,
            date_start: filters.date_start, date_end: filters.date_end,
            sort_by: sortInfo.field,
            sort_order: sortInfo.order === 'ascend' ? 'asc' : 'desc',
            ...filters,
            search_term: debouncedSearchTerm,
        };

        if (params.date_range && params.date_range.length === 2) {
            params.date_start = dayjs(params.date_range[0]).format('YYYY-MM-DD');
            params.date_end = dayjs(params.date_range[1]).format('YYYY-MM-DD');
        }
        delete params.date_range;

        Object.keys(params).forEach(key => {
            if (params[key] === undefined || params[key] === null || params[key] === '') {
                delete params[key];
            }
        });

        getIncomes(params)
            .then(response => {
                setIncomes(response.data);
                setPagination(prev => ({ ...prev, current: response.pagination.current_page, total: response.pagination.total_items }));
            })
            .catch(() => setError("Gelirler yüklenirken bir hata oluştu."))
            .finally(() => setLoading(false));
    }, [pagination.current, pagination.pageSize,sortInfo, filters, debouncedSearchTerm ]);

    useEffect(() => {
        refreshIncomes();
    }, [refreshIncomes]);

    const {
        isModalVisible, uploadResults, editableRows, activeTab,
        loading: importLoading, handleExcelUpload, handleCellChange,
        handleSaveImports, closeUploadModal, setActiveTab,
        isConfirmationVisible, rowsToConfirm, handleConfirmAndImport, setIsConfirmationVisible,
        setLoading: setImportLoading,
        setUploadResults,
        setEditableRows,
        setIsModalVisible
    } = useExcelImport(uploadIncomesExcel, importValidatedIncomes, refreshIncomes);

    const { customers, regions, accountNames, budgetItems } = useDropdownData();

    // Debugging: Log dropdown data
    console.log('Regions Data:', regions);
    console.log('Account Names Data:', accountNames);
    console.log('Budget Items Data:', budgetItems);

    const handleDubaiUpload = async ({ file }) => {
        setImportLoading(true);
        try {
            const results = await uploadDubaiIncomesExcel(file);
            if (!Array.isArray(results)) {
                message.error("Sunucudan geçersiz bir yanıt formatı alındı.");
                return;
            }
            const needs_correction = results.filter(r => r.status === 'invalid');
            const duplicates = results.filter(r => r.status === 'duplicate');

            setUploadResults({ needs_correction, duplicates });
            setEditableRows(needs_correction.map(row => ({ ...row.data, key: row.row, errors: row.errors })));
            setActiveTab(needs_correction.length > 0 ? 'needs_correction' : 'duplicates');
            setIsModalVisible(true);
        } catch (error) {
            message.error(error.response?.data?.message || "Dubai dosyası işlenirken bir hata oluştu.");
        } finally {
            setImportLoading(false);
        }
    };

    useEffect(() => {
        refreshIncomes();
    }, [refreshIncomes]);

    const handleTableChange = (pagination, filters, sorter) => {
        setPagination(prev => ({ ...prev, current: pagination.current, pageSize: pagination.pageSize }));
        setSortInfo({ field: sorter.field, order: sorter.order });
    };

    const handleApplyFilters = (values) => {
        if (Array.isArray(values.status)) {
            values.status = values.status.join(',');
        }
        setPagination(p => ({ ...p, current: 1 }));
        setFilters(values);
    };

    const handleClearFilters = () => {
        filterForm.resetFields();
        setFilters({});
        setPagination(p => ({ ...p, current: 1 }));
    };


    const handleCreate = async (values) => {
        setLoading(true);
        try {
            await createIncome(values);
            message.success("Yeni gelir başarıyla eklendi.");
            setIsNewModalVisible(false);
            refreshIncomes();
        } catch (err) {
            message.error(err.response?.data?.error || "Yeni gelir eklenirken bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    const mainColumns = [
        { title: "Fatura No", dataIndex: "invoice_number", key: "invoice_number", sorter: true },
        { title: "Fatura İsmi", dataIndex: "invoice_name", key: "invoice_name", sorter: true, ellipsis: true },
        { title: "Müşteri", dataIndex: ["customer", "name"], key: "customer" },
        { title: "Vergi Numarası", dataIndex: ["customer", "tax_number"], key: "tax_number" },
        
        // --- GÜNCELLENEN SÜTUN: Toplam Tutar ---
        { 
            title: "Toplam Tutar", 
            dataIndex: "total_amount", 
            key: "total_amount", 
            sorter: true, 
            align: 'right', 
            render: (val, record) => {
                const amount = parseFloat(val);
                // Eğer bölge Dubai ise Dolar, değilse Lira olarak formatla
                if (record.region && record.region.name === 'Dubai') {
                    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
                }
                return amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
            } 
        },
        // --- GÜNCELLENEN SÜTUN: Tahsil Edilen ---
        { 
            title: "Tahsil Edilen", 
            dataIndex: "received_amount", 
            key: "received_amount", 
            sorter: true, 
            align: 'right', 
            render: (val, record) => {
                const amount = parseFloat(val);
                // Eğer bölge Dubai ise Dolar, değilse Lira olarak formatla
                if (record.region && record.region.name === 'Dubai') {
                    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
                }
                return amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
            } 
        },

        { title: "Durum", dataIndex: "status", key: "status", sorter: true, render: getStatusTag },
        { title: "Ödeme Zamanı", dataIndex: "timeliness_status", key: "timeliness_status", sorter: true, render: getTimelinessStatusTag },
        { title: "Düzenleme Tarihi", dataIndex: "issue_date", key: "issue_date", sorter: true, render: (val) => val ? dayjs(val).format('DD.MM.YYYY') : '-' },
        { 
            title: "Vade Tarihi", 
            dataIndex: "due_date", 
            key: "due_date", 
            sorter: true, 
            render: (val) => val ? dayjs(val).format('DD.MM.YYYY') : '-' 
        }
    ];

    const confirmationColumns = [
        { title: 'Fatura No', dataIndex: 'invoice_number', key: 'invoice_number', width: 150 },
        { title: 'Müşteri', dataIndex: 'customer_name', key: 'customer_name' },
        { title: 'Bölge', dataIndex: 'region_id', key: 'region_id', width: 120, render: (id) => regions.find(r => r.id === id)?.name || id },
        { title: 'Hesap Adı', dataIndex: 'account_name_id', key: 'account_name_id', width: 150, render: (id) => accountNames.find(a => a.id === id)?.name || id },
        { title: 'Bütçe Kalemi', dataIndex: 'budget_item_id', key: 'budget_item_id', width: 150, render: (id) => budgetItems.find(b => b.id === id)?.name || id },
        { title: 'Tutar', dataIndex: 'total_amount', key: 'total_amount', align: 'right', width: 120 },
    ];

const editableUploadColumns = [
    { title: 'Satır', dataIndex: 'row', key: 'row', width: 70, fixed: 'left' },
    { title: 'Fatura İsmi', dataIndex: 'invoice_name', key: 'invoice_name', width: 250, render: (text, record) => <Input defaultValue={text} onChange={(e) => handleCellChange(record.key, 'invoice_name', e.target.value)} /> },
    { title: 'Fatura No', dataIndex: 'invoice_number', key: 'invoice_number', width: 180, render: (text, record) => <Input defaultValue={text} status={record.errors?.invoice_number ? 'error' : ''} onChange={(e) => handleCellChange(record.key, 'invoice_number', e.target.value)} /> },
    { title: 'Tarih', dataIndex: 'issue_date', key: 'issue_date', width: 150, render: (text, record) => (<Tooltip title={record.errors?.issue_date} color="red"><Input defaultValue={dayjs(text).isValid() ? dayjs(text).format('DD.MM.YYYY') : text} placeholder="GG.AA.YYYY" status={record.errors?.issue_date ? 'error' : ''} onChange={(e) => handleCellChange(record.key, 'issue_date', e.target.value)} /></Tooltip>) },
    { title: 'Vade Tarihi', dataIndex: 'due_date', key: 'due_date', width: 150, render: (text, record) => (<Tooltip title={record.errors?.due_date} color="red"><Input defaultValue={dayjs(text).isValid() ? dayjs(text).format('DD.MM.YYYY') : text} placeholder="GG.AA.YYYY" status={record.errors?.due_date ? 'error' : ''} onChange={(e) => handleCellChange(record.key, 'due_date', e.target.value)} /></Tooltip>) },
    { title: 'Müşteri', dataIndex: 'customer_id', key: 'customer_id', width: 220, render: (text, record) => { if (record.is_new_customer) { return <Tooltip title="Bu müşteri yeni oluşturulacak"><span>{record.customer_name} <Tag color="blue">Yeni</Tag></span></Tooltip>; } return (<Select defaultValue={text} status={record.errors?.customer_id ? 'error' : ''} onChange={(value) => handleCellChange(record.key, 'customer_id', value)} style={{ width: '100%' }} showSearch optionFilterProp="children" >{(customers || []).map(item => <Option key={item.id} value={item.id}>{item.name}</Option>)}</Select>);}},
    { title: 'Müşteri Vergi Numarası', dataIndex: 'tax_number', key: 'tax_number', width: 200, render: (text, record) => { if (record.is_new_customer) { return (<Input value={text} onChange={(e) => handleCellChange(record.key, 'tax_number', e.target.value)} placeholder="Yeni müşteri için VKN"/>); } else { const selectedCustomerId = record.customer_id; const customer = customers.find(c => c.id === selectedCustomerId); const existingTaxNumber = customer?.tax_number || ''; return (<Input value={existingTaxNumber} disabled placeholder="Mevcut müşterinin VKN'si"/>);}}},
    { title: 'Toplam Tutar', dataIndex: 'total_amount', key: 'total_amount', width: 120, render: (text, record) => (<Tooltip title={record.errors?.total_amount} color="red"><Input defaultValue={text} status={record.errors?.total_amount ? 'error' : ''} onChange={(e) => handleCellChange(record.key, 'total_amount', e.target.value)} /></Tooltip>)},
    { title: 'Bölge', dataIndex: 'region_id', key: 'region_id', width: 170, render: (text, record) => (<Select placeholder="Bölge Seçin" value={text} onChange={(value) => handleCellChange(record.key, 'region_id', value)} style={{ width: '100%' }}>{(regions || []).map(item => <Option key={item.id} value={item.id}>{item.name}</Option>)}</Select>)},
    { title: 'Hesap Adı', dataIndex: 'account_name_id', key: 'account_name_id', width: 170, render: (text, record) => (<Select placeholder="Hesap Adı Seçin" value={text} onChange={(value) => handleCellChange(record.key, 'account_name_id', value)} style={{ width: '100%' }}>{(accountNames || []).map(item => <Option key={item.id} value={item.id}>{item.name}</Option>)}</Select>)},
    { title: 'Bütçe Kalemi', dataIndex: 'budget_item_id', key: 'budget_item_id', width: 170, render: (text, record) => (<Select placeholder="Bütçe Kalemi Seçin" value={text} onChange={(value) => handleCellChange(record.key, 'budget_item_id', value)} style={{ width: '100%' }}>{(budgetItems || []).map(item => <Option key={item.id} value={item.id}>{item.name}</Option>)}</Select>)},
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
                    <Upload customRequest={handleDubaiUpload} showUploadList={false} accept=".xlsx, .xls">
                        <Button icon={<UploadOutlined />} style={{ marginLeft: 8 }}>Dubai Faturası Yükle</Button>
                    </Upload>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsNewModalVisible(true)} style={{ marginLeft: 8 }}>Yeni Gelir</Button>
                </div>
            </Row>

            <Collapse ghost>
                <Panel header={<><FilterOutlined /> Filtrele & Ara</>} key="1">
                    {/* --- YENİ VE GÜNCEL FİLTRE FORMU --- */}
                    <Form form={filterForm} onFinish={handleApplyFilters} layout="vertical">
                        <Row gutter={[16, 16]}>
                            <Col xs={24} sm={12} md={8}>
                                <Form.Item name="search_term" label="Fatura No / İsim Ara">
                                    <Input.Search placeholder="Aranacak metni girin..." allowClear onSearch={() => filterForm.submit()} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={8}>
                                <Form.Item name="date_range" label="Tarih Aralığı">
                                    <RangePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={8}>
                                <Form.Item name="status" label="Fatura Durumu">
                                    <Select mode="multiple" allowClear placeholder="Durum seçin">
                                        <Option value="UNRECEIVED">Edilmedi</Option>
                                        <Option value="PARTIALLY_RECEIVED">Kısmi Tahsil</Option>
                                        <Option value="RECEIVED">Tahsil Edildi</Option>
                                        <Option value="OVER_RECEIVED">Fazla Tahsil</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={8}>
                                <Form.Item name="customer_id" label="Müşteri">
                                    <Select allowClear showSearch placeholder="Müşteri seçin" optionFilterProp="children">
                                        {customers.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={8}>
                                <Form.Item name="region_id" label="Bölge">
                                    <Select allowClear showSearch placeholder="Bölge seçin" optionFilterProp="children">
                                        {regions.map(r => <Option key={r.id} value={r.id}>{r.name}</Option>)}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={8}>
                                <Form.Item name="account_name_id" label="Hesap Adı">
                                    <Select allowClear showSearch placeholder="Hesap adı seçin" optionFilterProp="children">
                                        {accountNames.map(a => <Option key={a.id} value={a.id}>{a.name}</Option>)}
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>
                        <Row justify="end">
                            <Space>
                                <Button onClick={handleClearFilters}>Temizle</Button>
                                <Button type="primary" htmlType="submit">Filtrele</Button>
                            </Space>
                        </Row>
                    </Form>
                </Panel>
            </Collapse>

            {error && <Alert message={error} type="error" style={{ margin: '16px 0' }} showIcon />}

            <Spin spinning={loading || importLoading}>
                <Table className={styles.modernTable} columns={mainColumns} dataSource={incomes} rowKey="id" pagination={pagination} onChange={handleTableChange} rowClassName={getRowClassName} onRow={(record) => ({ onClick: () => openIncomeModal(record.id), style: { cursor: "pointer" } })} />
            </Spin>

            <Modal title="Yeni Gelir Ekle" open={isNewModalVisible} onCancel={() => setIsNewModalVisible(false)} destroyOnClose footer={null} width={800}>
                <IncomeForm onFinish={handleCreate} onCancel={() => setIsNewModalVisible(false)} />
            </Modal>

            <Modal title="Gelir Excel Yükleme Sonuçları" open={isModalVisible} onCancel={closeUploadModal} width={1300}
                footer={[<Button key="back" onClick={closeUploadModal}>Kapat</Button>, <Button key="submit" type="primary" loading={importLoading} onClick={handleSaveImports} icon={<SaveOutlined />}>Doldurulanları İçe Aktar</Button>]}
            >
                <Tabs activeKey={activeTab} onChange={setActiveTab}>
                    <TabPane tab={`Düzenlenecek Satırlar (${uploadResults?.needs_correction?.length || 0})`} key="needs_correction">
                        <Alert message="Lütfen eksik kategorileri doldurun. Yeni müşteriler otomatik oluşturulacaktır. Duplike faturalar diğer sekmede listelenmiştir." type="info" showIcon style={{ marginBottom: 16 }} />
                        <Table columns={editableUploadColumns} dataSource={editableRows} pagination={{ pageSize: 5 }} rowKey="key" scroll={{ x: 1300 }} />
                    </TabPane>
                    <TabPane tab={`Tekrarlanan Kayıtlar (${uploadResults?.duplicates?.length || 0})`} key="duplicates" disabled={!uploadResults?.duplicates?.length}>
                        <Alert message="Bu faturalar veritabanında zaten mevcut olduğu için tekrar eklenmeyecektir." type="warning" showIcon style={{ marginBottom: 16 }} />
                        <Table columns={duplicateColumns} dataSource={uploadResults.duplicates} pagination={{ pageSize: 5 }} rowKey="row" />
                    </TabPane>
                </Tabs>
            </Modal>

            <Modal
                title={`Onay: ${rowsToConfirm?.length ||0} Satır İçe Aktarılacak`}
                open={isConfirmationVisible}
                onCancel={() => setIsConfirmationVisible(false)}
                onOk={handleConfirmAndImport}
                okText="Onayla ve Ekle"
                cancelText="İptal"
                width={1200}
                confirmLoading={importLoading}
            >
                <p>Aşağıdaki satırlar veritabanına eklenecektir. Lütfen kontrol edip onaylayın.</p>
                <Table
                    columns={confirmationColumns}
                    dataSource={rowsToConfirm}
                    rowKey="key"
                    pagination={{ pageSize: 5 }}
                    size="small"
                />
            </Modal>
        </div>
    );
}
