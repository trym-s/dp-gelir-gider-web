import React, { useState, useEffect, useCallback } from 'react';
import { Table, Typography, Button, Input, DatePicker, Row, Col, Space, Popconfirm, message, Spin, Alert, Tag, Modal } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "../../hooks/useDebounce";
import { getIncomes, deleteIncome, updateIncome } from "../../api/incomeService";
import dayjs from "dayjs";

const { Title } = Typography;
const { RangePicker } = DatePicker;

// Durum için etiketleme
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

export default function IncomeList() {
  const navigate = useNavigate();
  const [incomes, setIncomes] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editableIncome, setEditableIncome] = useState(null);

  const debouncedSearchTerm = useDebounce(filters.description, 500);

  const fetchIncomes = useCallback(async (page = 1, pageSize = 10) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        per_page: pageSize,
        description: debouncedSearchTerm,
        date_start: filters.date_start,
        date_end: filters.date_end,
      };
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
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
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, filters.date_start, filters.date_end]);

  useEffect(() => {
    fetchIncomes(pagination.current, pagination.pageSize);
  }, [fetchIncomes, pagination.current, pagination.pageSize]);

  const handleTableChange = (pagination) => {
    setPagination(prev => ({ ...prev, current: pagination.current, pageSize: pagination.pageSize }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleDelete = async () => {
    try {
      await deleteIncome(editableIncome.id);
      message.success("Gelir başarıyla silindi.");
      setIsModalVisible(false);
      fetchIncomes(pagination.current, pagination.pageSize);
    } catch (err) {
      message.error("Gelir silinirken bir hata oluştu.");
    }
  };

  const handleSave = async () => {
    try {
      const { id, ...updateData } = editableIncome;
      await updateIncome(id, updateData);
      message.success("Gelir başarıyla güncellendi.");
      setIsModalVisible(false);
      fetchIncomes(pagination.current, pagination.pageSize);
    } catch (err) {
      message.error("Güncelleme sırasında bir hata oluştu.");
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setEditableIncome(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date, dateString) => {
    setEditableIncome(prev => ({ ...prev, date: dateString }));
  };

  const handleRowClick = (record) => {
    setEditableIncome(record);
    setIsModalVisible(true);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
  };

  // Modal açıkken klavye kısayollarını dinle
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isModalVisible) return;

      if (event.key === 'Escape') {
        handleModalCancel();
      }
      if (event.key === 'Enter') {
        // Form içindeki bir input'ta Enter'a basıldığında formun submit olmasını engellemek için
        // event.preventDefault(); // Bu şimdilik gerekmeyebilir, ama sorun olursa eklenebilir.
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalVisible, handleSave]); // handleSave'i bağımlılıklara ekliyoruz

  const columns = [
    { title: "Açıklama", dataIndex: "description", key: "description", ellipsis: true },
    { title: "Şirket", dataIndex: ["company", "name"], key: "company" },
    { title: "Bölge", dataIndex: ["region", "name"], key: "region" },
    { title: "Toplam Tutar", dataIndex: "total_amount", key: "total_amount", align: 'right', render: (val) => `${val} ₺` },
    { title: "Alınan Tutar", dataIndex: "received_amount", key: "received_amount", align: 'right', render: (val) => `${val} ₺` },
    { title: "Durum", dataIndex: "status", key: "status", render: getStatusTag },
    { title: "Tarih", dataIndex: "date", key: "date", render: (val) => dayjs(val).format('DD/MM/YYYY') },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Gelir Listesi</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => message.info("Yeni gelir ekleme fonksiyonu henüz aktif değil.")}>
          Yeni Gelir
        </Button>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Input.Search
            placeholder="Açıklamada ara..."
            allowClear
            onSearch={(value) => handleFilterChange('description', value)}
            onChange={(e) => handleFilterChange('description', e.target.value)}
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
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

      {error && <Alert message={error} type="error" style={{ marginBottom: 16 }} showIcon />}
      
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
          open={isModalVisible}
          onCancel={handleModalCancel}
          destroyOnClose
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <Popconfirm
                key="delete"
                title="Bu geliri silmek istediğinize emin misiniz?"
                onConfirm={handleDelete}
                okText="Evet"
                cancelText="Hayır"
                placement="topRight" // Popconfirm'in yukarı doğru açılmasını sağla
              >
                <Button danger icon={<DeleteOutlined />}>
                  Sil
                </Button>
              </Popconfirm>
              <Space>
                <Button key="submit" type="primary" onClick={handleSave}>
                  Kaydet
                </Button>
              </Space>
            </div>
          }
        >
          <Space direction="vertical" style={{ width: '100%', paddingTop: '12px' }}>
            <Input
              addonBefore="Açıklama"
              name="description"
              value={editableIncome.description}
              onChange={handleFormChange}
            />
            <Input
              addonBefore="Tutar"
              name="total_amount"
              type="number"
              value={editableIncome.total_amount}
              onChange={handleFormChange}
            />
            <DatePicker
              style={{ width: '100%' }}
              value={dayjs(editableIncome.date)}
              onChange={handleDateChange}
              format="YYYY-MM-DD"
            />
          </Space>
        </Modal>
      )}
    </div>
  );
}
