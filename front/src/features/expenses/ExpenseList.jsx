import React, { useState, useEffect, useCallback } from 'react';
import { Table, Typography, Button, Input, DatePicker, Row, Col, message, Spin, Alert, Tag, Modal, Collapse } from "antd";
import { PlusOutlined, FilterOutlined } from "@ant-design/icons";
import { useDebounce } from "../../hooks/useDebounce";
import { getExpenses, createExpense, createExpenseGroup } from "../../api/expenseService";
import { useExpenseDetail } from '../../context/ExpenseDetailContext'; // Context'i import et
import ExpenseForm from "./components/ExpenseForm";
import styles from './ExpenseList.module.css'; // Import the CSS module
import dayjs from "dayjs";

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Panel } = Collapse;

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
        case 'PAID':
            return 'row-is-complete';
        case 'PARTIALLY_PAID':
            return 'row-is-partial';
        case 'UNPAID':
            return 'row-is-danger';
        default:
            return '';
    }
};

export default function ExpenseList() {
  const [expenses, setExpenses] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({});
  const [sortInfo, setSortInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isNewModalVisible, setIsNewModalVisible] = useState(false);
  
  const { openExpenseModal } = useExpenseDetail(); // Context'ten fonksiyonu al
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
  }, [debouncedSearchTerm, filters.date_start, filters.date_end]);

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

  const handleCreate = async (values) => {
    try {
      if (values.isGroup) {
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
      fetchExpenses(1, pagination.pageSize);
    } catch (err) {
      message.error("Yeni gider veya grup eklenirken bir hata oluştu.");
    }
  };

  const columns = [
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
          className={styles.modernTable} // Apply the style
          columns={columns}
          dataSource={expenses}
          rowKey="id"
          pagination={pagination}
          onChange={handleTableChange}
          rowClassName={getRowClassName}
          onRow={(record) => ({
            onClick: () => openExpenseModal(record.id), // Tıklanınca context fonksiyonunu çağır
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
    </div>
  );
}
