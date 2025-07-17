import React, { useState, useEffect, useCallback } from 'react';
import { Table, Typography, Button, Input, DatePicker, Row, Col, message, Spin, Alert, Tag, Modal, Collapse, Tabs, Tooltip, Upload } from "antd";
import { PlusOutlined, FilterOutlined, UploadOutlined, SaveOutlined, DownloadOutlined } from "@ant-design/icons";
import { useDebounce } from "../../hooks/useDebounce";
import { getIncomes, createIncome, uploadIncomesExcel, importValidatedIncomes } from "../../api/incomeService";
import { useIncomeDetail } from '../../context/IncomeDetailContext';
import GelirForm from "./components/GelirForm";
import styles from './IncomeList.module.css';
import dayjs from "dayjs";
import { api } from '../../api/api';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Panel } = Collapse;
const { TabPane } = Tabs;

// Yardımcı Fonksiyonlar
const getStatusTag = (status) => {
    const statusMap = {
        'RECEIVED': { color: 'green', text: 'Tahsil Edildi' },
        'UNRECEIVED': { color: 'red', text: 'Edilmedi' },
        'PARTIALLY_RECEIVED': { color: 'orange', text: 'Kısmi Tahsil' },
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
    const debouncedSearchTerm = useDebounce(filters.description, 500);

    const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
    const [uploadResults, setUploadResults] = useState({ valid: [], invalid: [] });
    const [editableRows, setEditableRows] = useState([]);
    const [activeTab, setActiveTab] = useState('invalid');

    const refreshIncomes = useCallback(() => {
        setLoading(true);
        setError(null);
        const params = {
            page: pagination.current, per_page: pagination.pageSize,
            description: debouncedSearchTerm, date_start: filters.date_start, date_end: filters.date_end,
            sort_by: sortInfo.field, sort_order: sortInfo.order === 'ascend' ? 'asc' : 'desc',
        };
        Object.keys(params).forEach(key => !params[key] && delete params[key]);

        getIncomes(params)
            .then(response => {
                setIncomes(response.data);
                setPagination(prev => ({...prev, current: response.pagination.current_page, total: response.pagination.total_items}));
            })
            .catch(() => setError("Gelirler yüklenirken bir hata oluştu."))
            .finally(() => setLoading(false));
    }, [pagination.current, pagination.pageSize, debouncedSearchTerm, filters.date_start, filters.date_end, sortInfo]);

    useEffect(() => { refreshIncomes(); }, [refreshIncomes]);

    const handleTableChange = (pagination, filters, sorter) => {
        setPagination(prev => ({ ...prev, current: pagination.current, pageSize: pagination.pageSize }));
        setSortInfo({ field: sorter.field, order: sorter.order });
    };

    const handleFilterChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

    const handleCreate = async (values) => {
        try {
            await createIncome(values);
            message.success("Yeni gelir başarıyla eklendi.");
            setIsNewModalVisible(false);
            refreshIncomes();
        } catch (err) {
            message.error("Yeni gelir eklenirken bir hata oluştu.");
        }
    };

    const handleExcelUpload = async (options) => {
        const { file } = options;
        try {
            const results = await uploadIncomesExcel(file);
            const valid = results.filter(r => r.status === 'valid');
            const invalid = results.filter(r => r.status === 'invalid');
            setUploadResults({ valid, invalid });
            setEditableRows(invalid.map(row => ({ ...row.data, key: row.row, errors: row.errors })));
            setActiveTab(invalid.length > 0 ? 'invalid' : 'valid');
            setIsUploadModalVisible(true);
            message.success(`${file.name} doğrulandı.`);
        } catch (error) {
            message.error(`${file.name} yüklenirken bir hata oluştu.`);
        }
    };

    const handleCellChange = (key, dataIndex, value) => {
        const newRows = [...editableRows];
        const target = newRows.find(item => item.key === key);
        if (target) {
            target[dataIndex] = value;
            setEditableRows(newRows);
        }
    };

    const handleSaveImports = async () => {
        const finalData = {
            valid_rows: uploadResults.valid.map(r => r.data),
            corrected_rows: editableRows,
        };
        try {
            setLoading(true);
            await importValidatedIncomes(finalData);
            message.success("Veriler başarıyla içe aktarıldı!");
            setIsUploadModalVisible(false);
            refreshIncomes();
        } catch (error) {
            message.error("Veriler içe aktarılırken bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    const mainColumns = [
        { title: "Açıklama", dataIndex: "description", key: "description", ellipsis: true },
        { title: "Şirket", dataIndex: ["company", "name"], key: "company" },
        { title: "Toplam Tutar", dataIndex: "total_amount", key: "total_amount", sorter: true, align: 'right', render: (val) => `${val} ₺` },
        { title: "Tahsil Edilen", dataIndex: "received_amount", key: "received_amount", sorter: true, align: 'right', render: (val) => `${val} ₺` },
        { title: "Durum", dataIndex: "status", key: "status", sorter: true, render: getStatusTag },
        { title: "Tarih", dataIndex: "date", key: "date", sorter: true, render: (val) => dayjs(val).format('DD/MM/YYYY') },
    ];
    
    const editableUploadColumns = [
        { title: 'Satır', dataIndex: 'key', key: 'row', width: 80 },
        { 
          title: 'Açıklama', dataIndex: 'description', key: 'description',
          render: (text, record) => (
            <Tooltip title={record.errors?.description}><Input defaultValue={text} status={record.errors?.description ? 'error' : ''} onChange={(e) => handleCellChange(record.key, 'description', e.target.value)}/></Tooltip>
          )
        },
        { 
          title: 'Toplam Tutar', dataIndex: 'total_amount', key: 'total_amount',
          render: (text, record) => (
            <Tooltip title={record.errors?.total_amount}><Input defaultValue={text} status={record.errors?.total_amount ? 'error' : ''} onChange={(e) => handleCellChange(record.key, 'total_amount', e.target.value)}/></Tooltip>
          )
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                <Title level={3} style={{ margin: 0 }}>Gelir Listesi</Title>
                <div>
                    <Button icon={<DownloadOutlined />} onClick={() => window.location.href = `${api.defaults.baseURL}/incomes/download-template`} style={{ marginRight: 8 }}>Taslak İndir</Button>
                    <Upload customRequest={handleExcelUpload} showUploadList={false}>
                        <Button icon={<UploadOutlined />}>Excel ile Yükle</Button>
                    </Upload>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsNewModalVisible(true)} style={{ marginLeft: 8 }}>Yeni Gelir</Button>
                </div>
            </Row>

            <Collapse ghost>
              {/* Filtreleme Paneli... */}
            </Collapse>

            {error && <Alert message={error} type="error" style={{ margin: '16px 0' }} showIcon />}

            <Spin spinning={loading}>
                <Table
                    className={styles.modernTable} columns={mainColumns} dataSource={incomes}
                    rowKey="id" pagination={pagination} onChange={handleTableChange}
                    rowClassName={getRowClassName}
                    onRow={(record) => ({ onClick: () => openIncomeModal(record.id), style: { cursor: "pointer" }})}
                />
            </Spin>

            <Modal title="Yeni Gelir Ekle" open={isNewModalVisible} onCancel={() => setIsNewModalVisible(false)} destroyOnClose footer={null}>
                <GelirForm onFinish={handleCreate} onCancel={() => setIsNewModalVisible(false)} />
            </Modal>

            <Modal
                title="Gelir Excel Yükleme Sonuçları" open={isUploadModalVisible} onCancel={() => setIsUploadModalVisible(false)} width={1200}
                footer={[
                    <Button key="back" onClick={() => setIsUploadModalVisible(false)}>Kapat</Button>,
                    <Button key="submit" type="primary" loading={loading} onClick={handleSaveImports} icon={<SaveOutlined />}>Düzeltilenleri İçe Aktar</Button>,
                ]}
            >
                <Tabs activeKey={activeTab} onChange={setActiveTab}>
                    <TabPane tab={`Hatalı Satırlar (${uploadResults.invalid.length})`} key="invalid" disabled={uploadResults.invalid.length === 0}>
                        <Alert message="Lütfen hatalı alanları düzeltip 'İçe Aktar' butonuna basın." type="warning" showIcon style={{marginBottom: 16}}/>
                        <Table columns={editableUploadColumns} dataSource={editableRows} pagination={false} rowKey="key"/>
                    </TabPane>
                    <TabPane tab={`Geçerli Satırlar (${uploadResults.valid.length})`} key="valid">
                        <Alert message="Bu satırlar sorunsuz bir şekilde içe aktarılmaya hazır." type="success" showIcon style={{marginBottom: 16}}/>
                        <Table
                            columns={[{ title: 'Satır', dataIndex: 'row' }, { title: 'Açıklama', dataIndex: ['data', 'description'] }, { title: 'Toplam Tutar', dataIndex: ['data', 'total_amount'] }]}
                            dataSource={uploadResults.valid} pagination={false} rowKey="row"
                        />
                    </TabPane>
                </Tabs>
            </Modal>
        </div>
    );
}