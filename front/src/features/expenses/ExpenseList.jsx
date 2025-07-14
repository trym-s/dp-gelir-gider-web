import React, { useState, useEffect, useCallback } from 'react';
import { Table, Typography, Button, Input, DatePicker, Row, Col, message, Spin, Alert, Tag, Modal, Collapse } from "antd";
import { PlusOutlined, FilterOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "../../hooks/useDebounce";
import { getExpenses, deleteExpense, updateExpense, createExpense } from "../../api/expenseService"; 
import ExpenseForm from "./components/ExpenseForm";
import dayjs from "dayjs";

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Panel } = Collapse;

// Durum için etiketleme
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

export default function ExpenseList() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({});
  const [sortInfo, setSortInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isNewModalVisible, setIsNewModalVisible] = useState(false);
  const [editableExpense, setEditableExpense] = useState(null);

  const debouncedSearchTerm = useDebounce(filters.description, 500);

  const fetchExpenses = useCallback(async (page, pageSize, sort = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        per_page: pageSize,
        description: debouncedSearchTerm,
        date_start: filters.date_start,
        date_end: filters.date_end,
        sort_by: sort.field,
        sort_order: sort.order === 'ascend' ? 'asc' : 'desc',
      };
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });
      const response = await getExpenses(params);
      setExpenses(response.data);
      setPagination({
        current: response.pagination.current_page,
        pageSize: pageSize,
        total: response.pagination.total_items,
      });
    } catch (err) {
      setError("Giderler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, filters.date_start, filters.date_end, sortInfo]);

  useEffect(() => {
    fetchExpenses(pagination.current, pagination.pageSize, sortInfo);
  }, [fetchExpenses, pagination.current, pagination.pageSize, sortInfo]);

  const handleTableChange = (pagination, filters, sorter) => {
    setPagination(prev => ({ ...prev, current: pagination.current, pageSize: pagination.pageSize }));
    setSortInfo({ field: sorter.field, order: sorter.order });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (values) => {
    try {
      // Backend'e sadece güncellenebilir ve beklenen alanları gönder
      const payload = {
        description: values.description,
        amount: values.amount,
        date: values.date,
        region_id: values.region_id,
        payment_type_id: values.payment_type_id,
        account_name_id: values.account_name_id,
        budget_item_id: values.budget_item_id,
      };

      await updateExpense(values.id, payload);
      message.success("Gider başarıyla güncellendi.");
      setIsEditModalVisible(false);
      fetchExpenses(pagination.current, pagination.pageSize);
    } catch (err) {
      message.error("Güncelleme sırasında bir hata oluştu.");
    }
  };

  const handleCreate = async (values) => {
    try {
      await createExpense(values);
      message.success("Yeni gider başarıyla eklendi.");
      setIsNewModalVisible(false);
      fetchExpenses(1, pagination.pageSize);
    } catch (err) {
      message.error("Yeni gider eklenirken bir hata oluştu.");
    }
  };

  const handleRowClick = (record) => {
    setEditableExpense(record);
    setIsEditModalVisible(true);
  };

  const columns = [
    { title: "Açıklama", dataIndex: "description", key: "description", ellipsis: true },
    { title: "Bölge", dataIndex: ["region", "name"], key: "region" },
    { title: "Ödeme Türü", dataIndex: ["payment_type", "name"], key: "payment_type" },
    { title: "Tutar", dataIndex: "amount", key: "amount", sorter: true, sortOrder: sortInfo.field === 'amount' && sortInfo.order, align: 'right', render: (val) => `${val} ₺` },
    { title: "Kalan Tutar", dataIndex: "remaining_amount", key: "remaining_amount", align: 'right', render: (val) => `${val} ₺` },
    { title: "Durum", dataIndex: "status", key: "status", sorter: true, sortOrder: sortInfo.field === 'status' && sortInfo.order, render: getStatusTag },
    { title: "Tarih", dataIndex: "date", key: "date", sorter: true, sortOrder: sortInfo.field === 'date' && sortInfo.order, render: (val) => dayjs(val).format('DD/MM/YYYY') },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Gider Listesi</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsNewModalVisible(true)}>
          Yeni Gider
        </Button>
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
          columns={columns}
          dataSource={expenses}
          rowKey="id"
          pagination={pagination}
          onChange={handleTableChange}
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
            style: { cursor: "pointer" },
          })}
        />
      </Spin>

      {editableExpense && (
        <Modal
          title="Gideri Düzenle"
          open={isEditModalVisible}
          onCancel={() => setIsEditModalVisible(false)}
          destroyOnClose
          footer={null}
        >
          <ExpenseForm onFinish={handleSave} initialValues={editableExpense} onCancel={() => setIsEditModalVisible(false)} />
        </Modal>
      )}

      <Modal
        title="Yeni Gider Ekle"
        open={isNewModalVisible}
        onCancel={() => setIsNewModalVisible(false)}
        destroyOnClose
        footer={null}
      >
        <ExpenseForm onFinish={handleCreate} onCancel={() => setIsNewModalVisible(false)} />
      </Modal>
    </div>
  );
}
