import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Table, Typography, Button, Input, DatePicker, Row, Col, message, Spin, Alert, Tag, Modal, Collapse, Tabs, Tooltip } from "antd";
import { PlusOutlined, FilterOutlined, UploadOutlined, SaveOutlined, DownloadOutlined } from "@ant-design/icons";
import { useDebounce } from "../../hooks/useDebounce";
import { getExpenses, createExpense, createExpenseGroup, uploadExpensesExcel, importValidatedExpenses } from "../../api/expenseService";
import { useExpenseDetail } from '../../context/ExpenseDetailContext';
import ExpenseForm from "./components/ExpenseForm";
import styles from './ExpenseList.module.css';
import dayjs from "dayjs";
import { api } from '../../api/api';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Panel } = Collapse;
const { TabPane } = Tabs;

// === Yardımcı Fonksiyonlar (Değişiklik yok) ===
const getStatusTag = (status) => {
  const statusMap = {
    'PAID': { color: 'green', text: 'Ödendi' },
    'UNPAID': { color: 'red', text: 'Ödenmedi' },
    'PARTIALLY_PAID': { color: 'orange', text: 'Kısmi Ödendi' },
    'OVERPAID': { color: 'purple', text: 'Fazla Ödendi' },
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
  const [expenses, setExpenses] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({});
  const [sortInfo, setSortInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isNewModalVisible, setIsNewModalVisible] = useState(false);

  const { openExpenseModal } = useExpenseDetail();
  const debouncedSearchTerm = useDebounce(filters.description, 500);

  // --- Excel Yükleme State'leri ---
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [uploadResults, setUploadResults] = useState({ valid: [], invalid: [] });
  const [editableRows, setEditableRows] = useState([]);
  const [activeTab, setActiveTab] = useState('invalid');

  // --- Veri Çekme (Daha Basit useEffect) ---
  const refreshExpenses = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = {
      page: pagination.current,
      per_page: pagination.pageSize,
      description: debouncedSearchTerm,
      date_start: filters.date_start,
      date_end: filters.date_end,
      sort_by: sortInfo.field,
      sort_order: sortInfo.order === 'ascend' ? 'asc' : 'desc',
    };
    
    // Boş parametreleri sil
    Object.keys(params).forEach(key => {
      if (!params[key]) delete params[key];
    });

    getExpenses(params)
      .then(response => {
        setExpenses(response.data);
        setPagination(prev => ({
          ...prev,
          current: response.pagination.current_page,
          total: response.pagination.total_items,
        }));
      })
      .catch(() => setError("Giderler yüklenirken bir hata oluştu."))
      .finally(() => setLoading(false));
  }, [pagination.current, pagination.pageSize, debouncedSearchTerm, filters.date_start, filters.date_end, sortInfo]);

  useEffect(() => {
    refreshExpenses();
  }, [refreshExpenses]);

  // --- Handler Fonksiyonları ---
  const handleTableChange = (pagination, filters, sorter) => {
    setPagination(prev => ({ ...prev, current: pagination.current, pageSize: pagination.pageSize }));
    setSortInfo({ field: sorter.field, order: sorter.order });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleCreate = async (values) => {
    try {
      if (values.isGroup) {
        // ... (Grup oluşturma kodunuz - değişiklik yok)
        const groupPayload = {
          group_name: values.group_name,
          repeat_count: values.repeat_count,
          expense_template_data: {
            description: values.description,
            amount: values.amount,
            date: values.date,
            region_id: values.region_id,
            payment_type_id: values.payment_type_id,
            account_name_id: values.account_name_id,
            budget_item_id: values.budget_item_id,
          }
        };
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
    }
  };

  // --- Excel Yükleme Handler'ları ---
  const handleExcelUpload = async (options) => {
    const { file } = options;
    try {
      const results = await uploadExpensesExcel(file);
      const valid = results.filter(r => r.status === 'valid');
      const invalid = results.filter(r => r.status === 'invalid');
      
      setUploadResults({ valid, invalid });
      setEditableRows(invalid.map(row => ({ ...row.data, key: row.row, errors: row.errors })));
      setActiveTab(invalid.length > 0 ? 'invalid' : 'valid');
      setIsUploadModalVisible(true);
      message.success(`${file.name} doğrulandı. Lütfen sonuçları kontrol edin.`);
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
      valid_rows: uploadResults.valid.map(r => r.data), // Orijinal geçerli satırlar
      corrected_rows: editableRows, // Kullanıcının düzelttiği satırlar
    };

    try {
      setLoading(true);
      await importValidatedExpenses(finalData); 
      message.success("Veriler başarıyla içe aktarıldı!");
      setIsUploadModalVisible(false);
      refreshExpenses();
    } catch (error) {
      message.error("Veriler içe aktarılırken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // --- Sütun Tanımları ---
  const mainColumns = [
    { title: "Açıklama", dataIndex: "description", key: "description", ellipsis: true },
    { title: "Bölge", dataIndex: ["region", "name"], key: "region" },
    { title: "Ödeme Türü", dataIndex: ["payment_type", "name"], key: "payment_type" },
    { title: "Hesap Adı", dataIndex: ["account_name", "name"], key: "account_name" },
    { title: "Bütçe Kalemi", dataIndex: ["budget_item", "name"], key: "budget_item" },
    { title: "Tutar", dataIndex: "amount", key: "amount", sorter: true, sortOrder: sortInfo.field === 'amount' && sortInfo.order, align: 'right', render: (val) => `${val} ₺` },
    { title: "Kalan Tutar", dataIndex: "remaining_amount", key: "remaining_amount", align: 'right', render: (val) => `${val} ₺` },
    { title: "Durum", dataIndex: "status", key: "status", sorter: true, sortOrder: sortInfo.field === 'status' && sortInfo.order, render: getStatusTag },
    { title: "Tarih", dataIndex: "date", key: "date", sorter: true, sortOrder: sortInfo.field === 'date' && sortInfo.order, render: (val) => dayjs(val).format('DD/MM/YYYY') },
  ];

  const editableUploadColumns = [
    { title: 'Satır', dataIndex: 'key', key: 'row', width: 80 },
    { 
      title: 'Açıklama', 
      dataIndex: 'description', 
      key: 'description',
      render: (text, record) => (
        <Tooltip title={record.errors?.description}>
          <Input 
            defaultValue={text}
            status={record.errors?.description ? 'error' : ''}
            onChange={(e) => handleCellChange(record.key, 'description', e.target.value)}
          />
        </Tooltip>
      )
    },
    { 
      title: 'Tutar', 
      dataIndex: 'amount', 
      key: 'amount',
      render: (text, record) => (
        <Tooltip title={record.errors?.amount}>
          <Input 
            defaultValue={text}
            status={record.errors?.amount ? 'error' : ''}
            onChange={(e) => handleCellChange(record.key, 'amount', e.target.value)}
          />
        </Tooltip>
      )
    },
     // Diğer düzenlenebilir alanlar için benzer render fonksiyonları ekleyebilirsiniz.
  ];

  // --- JSX Render ---
  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Gider Listesi</Title>
        <div>
          <Button 
            icon={<DownloadOutlined />} 
            onClick={() => window.location.href = `${api.defaults.baseURL}/expenses/download-template`}
            style={{ marginRight: 8 }}
          >
            Taslak İndir
          </Button>
          <Upload customRequest={handleExcelUpload} showUploadList={false}>
            <Button icon={<UploadOutlined />}>Excel ile Yükle</Button>
          </Upload>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsNewModalVisible(true)} style={{ marginLeft: 8 }}>
            Yeni Gider
          </Button>
        </div>
      </Row>

      <Collapse ghost>
        <Panel header={<><FilterOutlined /> Filtrele & Ara</>} key="1">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Input.Search
                placeholder="Açıklamada ara..."
                allowClear
                onSearch={(value) => handleFilterChange('description', value)}
                onChange={(e) => handleFilterChange('description', e.target.value)}
              />
            </Col>
            <Col xs={24} sm={12}>
              <RangePicker
                style={{ width: "100%" }}
                onChange={(dates) => {
                  handleFilterChange('date_start', dates ? dayjs(dates[0]).format('YYYY-MM-DD') : null);
                  handleFilterChange('date_end', dates ? dayjs(dates[1]).format('YYYY-MM-DD') : null);
                }}
                format="DD/MM/YYYY"
              />
            </Col>
          </Row>
        </Panel>
      </Collapse>

      {error && <Alert message={error} type="error" style={{ margin: '16px 0' }} showIcon />}

      <Spin spinning={loading}>
        <Table
          className={styles.modernTable}
          columns={mainColumns}
          dataSource={expenses}
          rowKey="id"
          pagination={pagination}
          onChange={handleTableChange}
          rowClassName={getRowClassName}
          onRow={(record) => ({
            onClick: () => openExpenseModal(record.id),
            style: { cursor: "pointer" },
          })}
        />
      </Spin>

      <Modal
        title="Yeni Gider Ekle"
        open={isNewModalVisible}
        onCancel={() => setIsNewModalVisible(false)}
        destroyOnClose
        footer={null}
      >
        <ExpenseForm onFinish={handleCreate} onCancel={() => setIsNewModalVisible(false)} />
      </Modal>

      <Modal
        title="Excel Yükleme Sonuçları"
        open={isUploadModalVisible}
        onCancel={() => setIsUploadModalVisible(false)}
        width={1200}
        footer={[
          <Button key="back" onClick={() => setIsUploadModalVisible(false)}>Kapat</Button>,
          <Button key="submit" type="primary" loading={loading} onClick={handleSaveImports} icon={<SaveOutlined />}>
            Düzeltilenleri İçe Aktar
          </Button>,
        ]}
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab={`Hatalı Satırlar (${uploadResults.invalid.length})`} key="invalid" disabled={uploadResults.invalid.length === 0}>
            <Alert message="Lütfen hatalı alanları düzeltip 'İçe Aktar' butonuna basın." type="warning" showIcon style={{marginBottom: 16}}/>
            <Table
              columns={editableUploadColumns}
              dataSource={editableRows}
              pagination={false}
              rowKey="key"
            />
          </TabPane>
          <TabPane tab={`Geçerli Satırlar (${uploadResults.valid.length})`} key="valid">
             <Alert message="Bu satırlar sorunsuz bir şekilde içe aktarılmaya hazır." type="success" showIcon style={{marginBottom: 16}}/>
            <Table
              columns={[
                { title: 'Satır', dataIndex: 'row', key: 'row' },
                { title: 'Açıklama', dataIndex: ['data', 'description'], key: 'description' },
                { title: 'Tutar', dataIndex: ['data', 'amount'], key: 'amount' },
              ]}
              dataSource={uploadResults.valid}
              pagination={false}
              rowKey="row"
            />
          </TabPane>
        </Tabs>
      </Modal>
    </div>
  );
}