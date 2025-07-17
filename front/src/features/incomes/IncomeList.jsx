import React, { useState, useEffect, useCallback } from 'react';
import { Table, Typography, Button, Input, DatePicker, Row, Col, message, Spin, Alert, Tag, Modal, Collapse, Tooltip, Space } from "antd";
import { PlusOutlined, FilterOutlined, RetweetOutlined } from "@ant-design/icons";
import { useDebounce } from "../../hooks/useDebounce";
import { getIncomes, createIncome, createIncomeGroup } from "../../api/incomeService";
import { useIncomeDetail } from '../../context/IncomeDetailContext';
import IncomeForm from "./components/IncomeForm";
import styles from './IncomeList.module.css';
import dayjs from "dayjs";
import { Resizable } from 'react-resizable';
import '../../styles/Resizable.css';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Panel } = Collapse;

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

const getStatusTag = (status) => {
  const statusMap = {
    'RECEIVED': { color: 'green', text: 'Alındı' },
    'UNRECEIVED': { color: 'red', text: 'Alınmadı' },
    'PARTIALLY_RECEIVED': { color: 'orange', text: 'Kısmi Alındı' },
    'OVER_RECEIVED': { color: 'purple', text: 'Fazla Alındı' },
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
      Object.keys(params).forEach(key => { if (!params[key]) delete params[key]; });
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
      if (values.isGroup) {
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
        await createIncome(values);
        message.success("Yeni gelir başarıyla eklendi.");
      }
      setIsNewModalVisible(false);
      fetchIncomes(1, pagination.pageSize);
    } catch (err) {
      message.error("Yeni gelir veya grup eklenirken bir hata oluştu.");
    }
  };

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
        <IncomeForm onFinish={handleCreate} onCancel={() => setIsNewModalVisible(false)} />
      </Modal>
    </div>
  );
}