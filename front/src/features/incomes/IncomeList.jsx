import React, { useState, useEffect, useCallback } from 'react';
import { Table, Typography, Button, Input, DatePicker, Row, Col, Space, message, Spin, Alert, Tag, Modal, Collapse } from "antd";
import { PlusOutlined, FilterOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "../../hooks/useDebounce";
import { getIncomes, deleteIncome, updateIncome, createIncome } from "../../api/incomeService";
import GelirForm from "./components/GelirForm";
import dayjs from "dayjs";

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Panel } = Collapse;

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

// Arama terimini vurgulayan yardımcı bileşen
const Highlighter = ({ text = '', highlight = '' }) => {
  if (!highlight || !text) {
    return <span>{text}</span>;
  }
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.toString().split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i}>{part}</mark>
        ) : (
          part
        )
      )}
    </span>
  );
};

export default function IncomeList() {
  const navigate = useNavigate();
  const [incomes, setIncomes] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({});
  const [sortInfo, setSortInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isNewModalVisible, setIsNewModalVisible] = useState(false);
  const [editableIncome, setEditableIncome] = useState(null);

  const debouncedSearchTerm = useDebounce(filters.description, 500);

  const fetchIncomes = useCallback(async (page, pageSize, sort = {}) => {
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
      const response = await getIncomes(params);
      setIncomes(response.data);
      setPagination({
        current: response.pagination.current_page,
        pageSize: pageSize,
        total: response.pagination.total_items,
      });
    } catch (err) {
      setError("Gelirler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, filters.date_start, filters.date_end, sortInfo]);

  useEffect(() => {
    fetchIncomes(pagination.current, pagination.pageSize, sortInfo);
  }, [fetchIncomes, pagination.current, pagination.pageSize, sortInfo]);

  const handleTableChange = (pagination, filters, sorter) => {
    setPagination(prev => ({ ...prev, current: pagination.current, pageSize: pagination.pageSize }));
    setSortInfo({ field: sorter.field, order: sorter.order });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (values) => {
    try {
      await updateIncome(values.id, values);
      message.success("Gelir başarıyla güncellendi.");
      setIsEditModalVisible(false);
      fetchIncomes(pagination.current, pagination.pageSize);
    } catch (err) {
      message.error("Güncelleme sırasında bir hata oluştu.");
    }
  };

  const handleCreate = async (values) => {
    try {
      await createIncome(values);
      message.success("Yeni gelir başarıyla eklendi.");
      setIsNewModalVisible(false);
      fetchIncomes(1, pagination.pageSize);
    } catch (err) {
      message.error("Yeni gelir eklenirken bir hata oluştu.");
    }
  };

  const handleRowClick = (record) => {
    setEditableIncome(record);
    setIsEditModalVisible(true);
  };

  const columns = [
    { title: "Açıklama", dataIndex: "description", key: "description", ellipsis: true },
    { title: "Şirket", dataIndex: ["company", "name"], key: "company" },
    { title: "Bölge", dataIndex: ["region", "name"], key: "region" },
    { title: "Hesap Adı", dataIndex: ["account_name", "name"], key: "account_name" },
    { title: "Bütçe Kalemi", dataIndex: ["budget_item", "name"], key: "budget_item" },
    { title: "Toplam Tutar", dataIndex: "total_amount", key: "total_amount", sorter: true, sortOrder: sortInfo.field === 'total_amount' && sortInfo.order, align: 'right', render: (val) => `${val} ₺` },
    { title: "Durum", dataIndex: "status", key: "status", sorter: true, sortOrder: sortInfo.field === 'status' && sortInfo.order, render: getStatusTag },
    { title: "Tarih", dataIndex: "date", key: "date", sorter: true, sortOrder: sortInfo.field === 'date' && sortInfo.order, render: (val) => dayjs(val).format('DD/MM/YYYY') },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Gelir Listesi</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsNewModalVisible(true)}>
          Yeni Gelir
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
          dataSource={incomes}
          rowKey="id"
          pagination={pagination}
          onChange={handleTableChange}
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
            style: { cursor: "pointer" },
          })}
        />
      </Spin>

      {editableIncome && (
        <Modal
          title="Geliri Düzenle"
          open={isEditModalVisible}
          onCancel={() => setIsEditModalVisible(false)}
          destroyOnClose
          footer={null}
        >
          <GelirForm 
            onFinish={handleSave} 
            initialValues={editableIncome} 
            onCancel={() => setIsEditModalVisible(false)} 
          />
        </Modal>
      )}

      <Modal
        title="Yeni Gelir Ekle"
        open={isNewModalVisible}
        onCancel={() => setIsNewModalVisible(false)}
        destroyOnClose
        footer={null}
      >
        <GelirForm onFinish={handleCreate} onCancel={() => setIsNewModalVisible(false)} />
      </Modal>
    </div>
  );
}
