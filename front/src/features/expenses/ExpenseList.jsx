import React, { useState, useEffect, useCallback } from 'react';
import { Table, Typography, Button, Input, DatePicker, Row, Col, message, Spin, Alert, Tag, Modal, Tooltip, Space, Switch, Select, Drawer, Badge, Form } from "antd";
import { PlusOutlined, FilterOutlined, RetweetOutlined, PaperClipOutlined } from "@ant-design/icons";
import { useDebounce } from "../../hooks/useDebounce";
import { getExpenses, createExpense, createExpenseGroup, getExpenseGroups } from "../../api/expenseService";
import { regionService } from '../../api/regionService';
import { paymentTypeService } from '../../api/paymentTypeService';
import { accountNameService } from '../../api/accountNameService';
import { budgetItemService } from '../../api/budgetItemService';
import { ExpenseDetailProvider, useExpenseDetail } from '../../context/ExpenseDetailContext';
import ExpenseForm from "./components/ExpenseForm";
import styles from './ExpenseList.module.css';
import dayjs from "dayjs";
import { Resizable } from 'react-resizable';
import '../../styles/Resizable.css';
import ExpensePdfModal from './components/ExpensePdfModal'; 

const { Title } = Typography;
const { RangePicker } = DatePicker;

const ResizableTitle = (props) => {
  const { onResize, width, ...restProps } = props;
  if (!width) {
    return <th {...restProps} />;
  }
  return (
    <Resizable
      width={width}
      height={0}
      handle={<span className="react-resizable-handle" />}
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th {...restProps} />
    </Resizable>
  );
};

const EXPENSE_STATUS_MAP = {
  'PAID': { color: 'green', text: 'Ödendi' },
  'UNPAID': { color: 'red', text: 'Ödenmedi' },
  'PARTIALLY_PAID': { color: 'orange', text: 'Kısmi Ödendi' },
  'OVERPAID': { color: 'purple', text: 'Fazla Ödendi' },
};

const getStatusTag = (status) => {
  const { color, text } = EXPENSE_STATUS_MAP[status] || { color: 'default', text: status };
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

function ExpenseListContent({ fetchExpenses, pagination, setPagination, refreshKey }) {
  const [expenses, setExpenses] = useState([]);
  const [filters, setFilters] = useState({});
  const [draftFilters, setDraftFilters] = useState({});
  const [sortInfo, setSortInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isNewModalVisible, setIsNewModalVisible] = useState(false);
  const [isFilterDrawerVisible, setIsFilterDrawerVisible] = useState(false);
  
  const [expenseGroups, setExpenseGroups] = useState([]);
  const [regions, setRegions] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [accountNames, setAccountNames] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  const [isPdfModalVisible, setIsPdfModalVisible] = useState(false);
  const [selectedExpenseIdForPdf, setSelectedExpenseIdForPdf] = useState(null);

  const { openExpenseModal } = useExpenseDetail();
  
  const debouncedSearchTerm = useDebounce(filters.description, 500);

  useEffect(() => {
    const loadDropdownData = async () => {
      // Promise.allSettled kullanarak tüm isteklerin sonucunu bekle (başarılı veya başarısız)
      const results = await Promise.allSettled([
        getExpenseGroups(),
        regionService.getAll(),
        paymentTypeService.getAll(),
        accountNameService.getAll(),
        budgetItemService.getAll()
      ]);

      // Her bir state'i, istek başarılıysa gelen veriyle, başarısızsa boş bir diziyle ayarla
      const [groups, regionsData, paymentTypesData, accountNamesData, budgetItemsData] = results;

      setExpenseGroups(groups.status === 'fulfilled' ? groups.value : []);
      setRegions(regionsData.status === 'fulfilled' ? regionsData.value : []);
      setPaymentTypes(paymentTypesData.status === 'fulfilled' ? paymentTypesData.value : []);
      setAccountNames(accountNamesData.status === 'fulfilled' ? accountNamesData.value : []);
      setBudgetItems(budgetItemsData.status === 'fulfilled' ? budgetItemsData.value : []);

      // Eğer herhangi bir istek başarısız olduysa genel bir hata mesajı göster
      if (results.some(res => res.status === 'rejected')) {
        message.error("Filtre verilerinin bir kısmı yüklenemedi.");
      }
    };
    loadDropdownData();
  }, []);
  
  const initialColumns = [
    { 
      title: "Hesap Adı", 
      dataIndex: ["account_name", "name"], // account_name nesnesinin içindeki name alanını alır
      key: "account_name", 
      width: 180 
    },
    { 
      title: "Açıklama", 
      dataIndex: "description", 
      key: "description", 
      width: 300,
      render: (text, record) => (
        <Space>
          {record.group && (
            <Tooltip title={`Grup: ${record.group.name}`}>
              <RetweetOutlined style={{ color: 'rgba(0, 0, 0, 0.45)' }} />
            </Tooltip>
          )}
          {text}
        </Space>
      )
    },
    { title: "Bütçe Kalemi", dataIndex: ["budget_item", "name"], key: "budget_item", width: 150 },
    { title: "Bölge", dataIndex: ["region", "name"], key: "region", width: 150 },
    { title: "Tutar", dataIndex: "amount", key: "amount", sorter: true, sortOrder: sortInfo.field === 'amount' && sortInfo.order, align: 'right', width: 120, render: (val) => `${val} ₺` },
    { title: "Kalan Tutar", dataIndex: "remaining_amount", key: "remaining_amount", align: 'right', width: 120, render: (val) => `${val} ₺` },
    { title: "Vade Tarihi", dataIndex: "date", key: "date", sorter: true, sortOrder: sortInfo.field === 'date' && sortInfo.order, width: 120, render: (val) => dayjs(val).format('DD/MM/YYYY') },
    { 
      title: "Ödenme Tarihi", 
      dataIndex: "completed_at", 
      key: "completed_at", 
      sorter: true, 
      sortOrder: sortInfo.field === 'completed_at' && sortInfo.order, 
      width: 120, 
      render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '-' 
    },
    { 
      title: "Ödeme Günü", 
      dataIndex: "payment_day", // Hesabın içindeki ödeme gününü alır
      key: "payment_day",
      width: 120,
      render: (text) => text || '-' // Eğer gün yoksa tire (-) göster
    },
    { title: "Durum", dataIndex: "status", key: "status", sorter: true, sortOrder: sortInfo.field === 'status' && sortInfo.order, width: 130, render: getStatusTag },
    {
      title: 'Dekontlar', // Sütun başlığı değişti
      key: 'pdf',
      align: 'center',
      width: 100,
      render: (_, record) => (
        <Button 
          icon={<PaperClipOutlined />} 
          onClick={(e) => {
            e.stopPropagation(); // Olayın satıra sıçramasını durdur.
            // DEĞİŞTİ: Yeni modal'ı açan fonksiyon
            handlePdfModalOpen(record.id); 
          }}
        >
          {/* Backend to_dict'e eklediğimiz 'pdf_count' alanını kullanıyoruz */}
          {record.pdf_count > 0 ? `(${record.pdf_count})` : ''}
        </Button>
      ),
    },
  ];

  const [columns, setColumns] = useState(initialColumns);

  const handleResize = (index) => (e, { size }) => {
    const nextColumns = [...columns];
    nextColumns[index] = {
      ...nextColumns[index],
      width: size.width,
    };
    setColumns(nextColumns);
  };

  const mergedColumns = columns.map((col, index) => ({
    ...col,
    onHeaderCell: (column) => ({
      width: column.width,
      onResize: handleResize(index),
    }),
  }));

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const activeFilters = {
        description: debouncedSearchTerm,
        date_start: filters.date_start,
        date_end: filters.date_end,
        is_grouped: filters.is_grouped ? 'true' : undefined,
        group_id: filters.group_id,
        status: filters.status && filters.status.length > 0 ? filters.status.join(',') : undefined,
        region_id: filters.region_id && filters.region_id.length > 0 ? filters.region_id.join(',') : undefined,
        payment_type_id: filters.payment_type_id && filters.payment_type_id.length > 0 ? filters.payment_type_id.join(',') : undefined,
        account_name_id: filters.account_name_id && filters.account_name_id.length > 0 ? filters.account_name_id.join(',') : undefined,
        budget_item_id: filters.budget_item_id && filters.budget_item_id.length > 0 ? filters.budget_item_id.join(',') : undefined,
      };
      const response = await fetchExpenses(pagination.current, pagination.pageSize, sortInfo, activeFilters);
      setExpenses(response.data);
      setPagination(prev => ({ ...prev, total: response.pagination.total_items }));
    } catch (err) {
      setError("Giderler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [fetchExpenses, pagination.current, pagination.pageSize, sortInfo, debouncedSearchTerm, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

   const handlePdfModalOpen = (expenseId) => {
    setSelectedExpenseIdForPdf(expenseId);
    setIsPdfModalVisible(true);
  };
  
  const handleTableChange = (p, f, sorter) => {
    setPagination(prev => ({ ...prev, current: p.current, pageSize: p.pageSize }));
    setSortInfo({ field: sorter.field, order: sorter.order });
  };

  const handleApplyFilters = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    setFilters(draftFilters);
    setIsFilterDrawerVisible(false);
  };

  const handleClearFilters = () => {
    setDraftFilters({});
    setFilters({});
    setPagination(prev => ({ ...prev, current: 1 }));
    setIsFilterDrawerVisible(false);
  };

  const handleCreate = async (values, isGroup) => {
    try {
      if (isGroup) {
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
      fetchData();
    } catch (err) {
      message.error("Yeni gider veya grup eklenirken bir hata oluştu.");
    }
  };

  const activeFilterCount = Object.values(filters).filter(v => v && (!Array.isArray(v) || v.length > 0)).length;

  const tagRender = (props) => {
    const { label, value, closable, onClose } = props;
    const { color } = EXPENSE_STATUS_MAP[value] || {};
    return (
      <Tag color={color} onClose={onClose} closable={closable} style={{ marginRight: 3 }}>
        {label}
      </Tag>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Gider Listesi</Title>
        <Space>
          <Badge count={activeFilterCount}>
            <Button icon={<FilterOutlined />} onClick={() => setIsFilterDrawerVisible(true)}>
              Filtrele
            </Button>
          </Badge>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsNewModalVisible(true)}>
            Yeni Gider
          </Button>
        </Space>
      </Row>

      <Drawer
        title="Filtrele"
        placement="right"
        onClose={() => setIsFilterDrawerVisible(false)}
        open={isFilterDrawerVisible}
        width={350}
        footer={
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={handleClearFilters}>Temizle</Button>
            <Button type="primary" onClick={handleApplyFilters}>Uygula</Button>
          </Space>
        }
      >
        <Form layout="vertical">
          <Form.Item label="Açıklamada Ara">
            <Input
              placeholder="Açıklamada ara..."
              value={draftFilters.description}
              onChange={(e) => setDraftFilters(prev => ({ ...prev, description: e.target.value }))}
            />
          </Form.Item>
          <Form.Item label="Tarih Aralığı">
            <RangePicker
              style={{ width: "100%" }}
              value={draftFilters.date_start && draftFilters.date_end ? [dayjs(draftFilters.date_start), dayjs(draftFilters.date_end)] : null}
              onChange={(dates) => {
                setDraftFilters(prev => ({
                  ...prev,
                  date_start: dates ? dayjs(dates[0]).format('YYYY-MM-DD') : null,
                  date_end: dates ? dayjs(dates[1]).format('YYYY-MM-DD') : null,
                }));
              }}
              format="DD/MM/YYYY"
            />
          </Form.Item>
          <Form.Item label="Durum">
            <Select
              mode="multiple"
              allowClear
              style={{ width: '100%' }}
              placeholder="Durum seçin"
              value={draftFilters.status}
              onChange={(value) => setDraftFilters(prev => ({ ...prev, status: value }))}
              tagRender={tagRender}
            >
              {Object.entries(EXPENSE_STATUS_MAP).map(([key, { text, color }]) => (
                <Select.Option key={key} value={key}>
                  <Space>
                    <Badge color={color} />
                    {text}
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Bölge">
            <Select
              mode="multiple"
              allowClear
              style={{ width: '100%' }}
              placeholder="Bölge seçin"
              value={draftFilters.region_id}
              onChange={(value) => setDraftFilters(prev => ({ ...prev, region_id: value }))}
            >
              {regions.map(item => <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="Ödeme Türü">
            <Select
              mode="multiple"
              allowClear
              style={{ width: '100%' }}
              placeholder="Ödeme türü seçin"
              value={draftFilters.payment_type_id}
              onChange={(value) => setDraftFilters(prev => ({ ...prev, payment_type_id: value }))}
            >
              {paymentTypes.map(item => <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="Hesap Adı">
            <Select
              mode="multiple"
              allowClear
              style={{ width: '100%' }}
              placeholder="Hesap adı seçin"
              value={draftFilters.account_name_id}
              onChange={(value) => setDraftFilters(prev => ({ ...prev, account_name_id: value }))}
            >
              {accountNames.map(item => <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="Bütçe Kalemi">
            <Select
              mode="multiple"
              allowClear
              style={{ width: '100%' }}
              placeholder="Bütçe kalemi seçin"
              value={draftFilters.budget_item_id}
              onChange={(value) => setDraftFilters(prev => ({ ...prev, budget_item_id: value }))}
            >
              {budgetItems.map(item => <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="Grup">
            <Switch
              checked={draftFilters.is_grouped}
              onChange={(checked) => setDraftFilters(prev => ({ ...prev, is_grouped: checked, group_id: null }))}
            />
          </Form.Item>
          {draftFilters.is_grouped && (
            <Form.Item label="Grup Seçimi">
              <Select
                placeholder="Bir grup seçin"
                allowClear
                style={{ width: '100%' }}
                value={draftFilters.group_id}
                onChange={(value) => setDraftFilters(prev => ({ ...prev, group_id: value }))}
              >
                {expenseGroups.map(group => (
                  <Select.Option key={group.id} value={group.id}>{group.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}
        </Form>
      </Drawer>

      {error && <Alert message={error} type="error" style={{ margin: '16px 0' }} showIcon />}
      
      <Spin spinning={loading}>
        <Table
          bordered
          className={styles.modernTable}
          components={{ header: { cell: ResizableTitle } }}
          columns={mergedColumns}
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
      {selectedExpenseIdForPdf && (
        <ExpensePdfModal 
          expenseId={selectedExpenseIdForPdf}
          visible={isPdfModalVisible}
          onCancel={() => setIsPdfModalVisible(false)}
          onUpdate={fetchData} // Modal'da bir değişiklik olduğunda ana listeyi yeniler
        />
      )}
    </div>
  );
}

export default function ExpenseList() {
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchExpenses = useCallback(async (page, pageSize, sort = {}, filters = {}) => {
    const params = {
      page,
      per_page: pageSize,
      sort_by: sort.field,
      sort_order: sort.order === 'ascend' ? 'asc' : 'desc',
      ...filters
    };
    Object.keys(params).forEach(key => { if (!params[key]) delete params[key]; });
    return await getExpenses(params);
  }, []);

  const handleRefresh = () => {
    setRefreshKey(oldKey => oldKey + 1);
  };

  return (
    <ExpenseDetailProvider onExpenseUpdate={handleRefresh}>
      <ExpenseListContent 
        fetchExpenses={fetchExpenses} 
        pagination={pagination} 
        setPagination={setPagination}
        refreshKey={refreshKey}
      />
    </ExpenseDetailProvider>
  );
}