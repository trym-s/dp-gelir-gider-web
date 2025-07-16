import React, { useState, useEffect, useCallback } from 'react';
import { Table, Typography, Button, Input, DatePicker, Row, Col, message, Spin, Alert, Tag, Modal, Collapse } from "antd";
import { PlusOutlined, FilterOutlined } from "@ant-design/icons";
import { useDebounce } from "../../hooks/useDebounce";
import { getIncomes, createIncome } from "../../api/incomeService";
import { useIncomeDetail } from '../../context/IncomeDetailContext';
import GelirForm from "./components/GelirForm";
import styles from './IncomeList.module.css'; // Import the CSS module
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

const getRowClassName = (record) => {
    switch (record.status) {
        case 'RECEIVED':
            return 'row-is-complete';
        case 'PARTIALLY_RECEIVED':
            return 'row-is-partial';
        case 'UNRECEIVED':
            return 'row-is-danger';
        default:
            return '';
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
  }, [debouncedSearchTerm, filters.date_start, filters.date_end]);

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

  const columns = [
    { title: "Açıklama", dataIndex: "description", key: "description", ellipsis: true },
    { title: "Şirket", dataIndex: ["company", "name"], key: "company" },
    { title: "Bölge", dataIndex: ["region", "name"], key: "region" },
    { title: "Hesap Adı", dataIndex: ["account_name", "name"], key: "account_name" },
    { title: "Bütçe Kalemi", dataIndex: ["budget_item", "name"], key: "budget_item" },
    { title: "Toplam Tutar", dataIndex: "total_amount", key: "total_amount", sorter: true, sortOrder: sortInfo.field === 'total_amount' && sortInfo.order, align: 'right', render: (val) => `${val} ₺` },
    { title: "Tahsil Edilen", dataIndex: "received_amount", key: "received_amount", sorter: true, sortOrder: sortInfo.field === 'received_amount' && sortInfo.order, align: 'right', render: (val) => `${val} ₺` },
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
          className={styles.modernTable} // Apply the style
          columns={columns}
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
        <GelirForm onFinish={handleCreate} onCancel={() => setIsNewModalVisible(false)} />
      </Modal>
    </div>
  );
}
