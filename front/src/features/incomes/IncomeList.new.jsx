import React, { useState, useEffect, useCallback } from 'react';
import { Table, Typography, Button, Input, DatePicker, Row, Col, message, Spin, Alert, Tag, Modal, Tooltip, Space, Switch, Select, Drawer, Badge, Form } from "antd";
import { PlusOutlined, FilterOutlined, RetweetOutlined } from "@ant-design/icons";
import { useDebounce } from "../../hooks/useDebounce";
import { getIncomes, createIncome, createIncomeGroup, getIncomeGroups } from "../../api/incomeService";
import { regionService } from '../../api/regionService';
import { companyService } from '../../api/companyService';
import { accountNameService } from '../../api/accountNameService';
import { budgetItemService } from '../../api/budgetItemService';
import { IncomeDetailProvider, useIncomeDetail } from '../../context/IncomeDetailContext';
import IncomeForm from "./components/IncomeForm";
import styles from './IncomeList.module.css';
import dayjs from "dayjs";
import { Resizable } from 'react-resizable';
import '../../styles/Resizable.css';

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

const INCOME_STATUS_MAP = {
  'RECEIVED': { color: 'green', text: 'Alındı' },
  'UNRECEIVED': { color: 'red', text: 'Alınmadı' },
  'PARTIALLY_RECEIVED': { color: 'orange', text: 'Kısmi Alındı' },
  'OVER_RECEIVED': { color: 'purple', text: 'Fazla Alındı' },
};

const getStatusTag = (status) => {
  const { color, text } = INCOME_STATUS_MAP[status] || { color: 'default', text: status };
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

function IncomeListContent({ fetchIncomes, pagination, setPagination, refreshKey, onRefresh }) {
  const [incomes, setIncomes] = useState([]);
  const [filters, setFilters] = useState({});
  const [draftFilters, setDraftFilters] = useState({});
  const [sortInfo, setSortInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isNewModalVisible, setIsNewModalVisible] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isFilterDrawerVisible, setIsFilterDrawerVisible] = useState(false);
  
  const [incomeGroups, setIncomeGroups] = useState([]);
  const [regions, setRegions] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [accountNames, setAccountNames] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);

  const { openIncomeModal } = useIncomeDetail();
  const debouncedSearchTerm = useDebounce(filters.description, 500);

  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [groups, regionsData, companiesData, accountNamesData, budgetItemsData] = await Promise.all([
          getIncomeGroups(),
          regionService.getAll(),
          companyService.getAll(),
          accountNameService.getAll(),
          budgetItemService.getAll()
        ]);
        setIncomeGroups(groups);
        setRegions(regionsData);
        setCompanies(companiesData);
        setAccountNames(accountNamesData);
        setBudgetItems(budgetItemsData);
      } catch (err) {
        message.error("Filtre verileri yüklenemedi.");
      }
    };
    loadDropdownData();
  }, []);

  const initialColumns = [
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
    { title: "Bölge", dataIndex: ["region", "name"], key: "region", width: 150 },
    { title: "Firma", dataIndex: ["company", "name"], key: "company", width: 150 },
    { title: "Hesap Adı", dataIndex: ["account_name", "name"], key: "account_name", width: 150 },
    { title: "Bütçe Kalemi", dataIndex: ["budget_item", "name"], key: "budget_item", width: 150 },
    { title: "Tutar", dataIndex: "total_amount", key: "total_amount", sorter: true, sortOrder: sortInfo.field === 'total_amount' && sortInfo.order, align: 'right', width: 120, render: (val) => `${val} ₺` },
    { title: "Kalan Tutar", dataIndex: "remaining_amount", key: "remaining_amount", align: 'right', width: 120, render: (val) => `${val} ₺` },
    { title: "Durum", dataIndex: "status", key: "status", sorter: true, sortOrder: sortInfo.field === 'status' && sortInfo.order, width: 130, render: getStatusTag },
    { title: "Tarih", dataIndex: "date", key: "date", sorter: true, sortOrder: sortInfo.field === 'date' && sortInfo.order, width: 120, render: (val) => dayjs(val).format('DD/MM/YYYY') },
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
        company_id: filters.company_id && filters.company_id.length > 0 ? filters.company_id.join(',') : undefined,
        account_name_id: filters.account_name_id && filters.account_name_id.length > 0 ? filters.account_name_id.join(',') : undefined,
        budget_item_id: filters.budget_item_id && filters.budget_item_id.length > 0 ? filters.budget_item_id.join(',') : undefined,
      };
      const response = await fetchIncomes(pagination.current, pagination.pageSize, sortInfo, activeFilters);
      setIncomes(response.data);
      setPagination(prev => ({ ...prev, total: response.pagination.total_items }));
    } catch (err) {
      setError("Gelirler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [fetchIncomes, pagination.current, pagination.pageSize, sortInfo, debouncedSearchTerm, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

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
    setIsCreating(true);
    try {
      if (isGroup) {
        const groupPayload = {
          group_name: values.group_name,
          repeat_count: values.repeat_count,
          income_template_data: {
            description: values.description,
            total_amount: values.total_amount,
            date: values.date,
            region_id: values.region_id,
            account_name_id: values.account_name_id,
            budget_item_id: values.budget_item_id,
            company_id: values.company_id,
          }
        };
        await createIncomeGroup(groupPayload);
        message.success("Gelir grubu başarıyla oluşturuldu.");
      } else {
        const singleIncomePayload = { ...values };
        delete singleIncomePayload.payment_type_id;
        await createIncome(singleIncomePayload);
        message.success("Yeni gelir başarıyla eklendi.");
      }
      setIsNewModalVisible(false);
      onRefresh();
    } catch (err) {
      message.error("Yeni gelir veya grup eklenirken bir hata oluştu.");
    } finally {
      setIsCreating(false);
    }
  };

  const activeFilterCount = Object.values(filters).filter(v => v && (!Array.isArray(v) || v.length > 0)).length;

  const tagRender = (props) => {
    const { label, value, closable, onClose } = props;
    const { color } = INCOME_STATUS_MAP[value] || {};
    return (
      <Tag color={color} onClose={onClose} closable={closable} style={{ marginRight: 3 }}>
        {label}
      </Tag>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Gelir Listesi</Title>
        <Space>
          <Badge count={activeFilterCount}>
            <Button icon={<FilterOutlined />} onClick={() => setIsFilterDrawerVisible(true)}>
              Filtrele
            </Button>
          </Badge>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsNewModalVisible(true)}>
            Yeni Gelir
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
              {Object.entries(INCOME_STATUS_MAP).map(([key, { text, color }]) => (
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
          <Form.Item label="Firma">
            <Select
              mode="multiple"
              allowClear
              style={{ width: '100%' }}
              placeholder="Firma seçin"
              value={draftFilters.company_id}
              onChange={(value) => setDraftFilters(prev => ({ ...prev, company_id: value }))}
            >
              {companies.map(item => <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>)}
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
                {incomeGroups.map(group => (
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
          dataSource={incomes}
          rowKey="id"
          pagination={pagination}
          onChange={handleTableChange}
          rowClassName={getRowClassName}
          onRow={(record) => ({
            onClick: () => openIncomeModal(record.id),
            style: { cursor: "pointer" },
          })}
        />
      </Spin>

      <Modal
        title="Yeni Gelir Ekle"
        open={isNewModalVisible}
        onCancel={() => setIsNewModalVisible(false)}
        destroyOnClose
        footer={null}
      >
        <IncomeForm 
          onFinish={handleCreate} 
          onCancel={() => setIsNewModalVisible(false)}
          isSaving={isCreating}
        />
      </Modal>
    </div>
  );
}

export default function IncomeList() {
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchIncomes = useCallback(async (page, pageSize, sort = {}, filters = {}) => {
    const params = {
      page,
      per_page: pageSize,
      sort_by: sort.field,
      sort_order: sort.order === 'ascend' ? 'asc' : 'desc',
      ...filters
    };
    Object.keys(params).forEach(key => { if (!params[key]) delete params[key]; });
    return await getIncomes(params);
  }, []);

  const handleRefresh = () => {
    setRefreshKey(oldKey => oldKey + 1);
  };

  return (
    <IncomeDetailProvider onIncomeUpdate={handleRefresh}>
      <IncomeListContent 
        fetchIncomes={fetchIncomes} 
        pagination={pagination} 
        setPagination={setPagination}
        refreshKey={refreshKey}
        onRefresh={handleRefresh}
      />
    </IncomeDetailProvider>
  );
}