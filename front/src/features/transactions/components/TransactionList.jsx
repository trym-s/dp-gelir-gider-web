import React, { useState, useEffect } from 'react';
import { Table, Typography, Button, Input, DatePicker, Row, Col, message, Spin, Alert, Tag, Modal, Tooltip, Space, Switch, Select, Drawer, Badge, Form } from "antd";
import { PlusOutlined, FilterOutlined, RetweetOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Resizable } from 'react-resizable';
import '../../../styles/Resizable.css';
import { useTransactionDetail } from '../context/TransactionDetailContext';
import TransactionForm from './TransactionForm';

const { Title } = Typography;
const { RangePicker } = DatePicker;

// These can be memoized or moved outside if they don't depend on props
const ResizableTitle = (props) => {
  const { onResize, width, ...restProps } = props;
  if (!width) return <th {...restProps} />;
  return (
    <Resizable width={width} height={0} handle={<span className="react-resizable-handle" />} onResize={onResize} draggableOpts={{ enableUserSelectHack: false }}>
      <th {...restProps} />
    </Resizable>
  );
};

const getStatusTag = (status, statusMap) => {
  const { color, text } = statusMap[status] || { color: 'default', text: status };
  return <Tag color={color}>{text}</Tag>;
};

const FilterDrawer = ({ visible, onClose, config, onApply, initialFilters }) => {
    const [form] = Form.useForm();
    const [dropdownData, setDropdownData] = useState({});

    useEffect(() => {
        form.setFieldsValue(initialFilters);
    }, [initialFilters, form]);

    useEffect(() => {
        const fetchDropdownData = async () => {
            const data = {};
            for (const filter of config.list.filters) {
                try {
                    data[filter.id] = await filter.service();
                } catch (e) {
                    message.error(`${filter.label} verileri yüklenemedi.`);
                    data[filter.id] = [];
                }
            }
            setDropdownData(data);
        };
        fetchDropdownData();
    }, [config.list.filters]);

    const handleApply = () => {
        const values = form.getFieldsValue();
        const processedFilters = { ...values };
        if (processedFilters.date_range) {
            processedFilters.date_start = dayjs(processedFilters.date_range[0]).format('YYYY-MM-DD');
            processedFilters.date_end = dayjs(processedFilters.date_range[1]).format('YYYY-MM-DD');
            delete processedFilters.date_range;
        }
        onApply(processedFilters);
        onClose();
    };

    const handleClear = () => {
        form.resetFields();
        onApply({});
        onClose();
    };

    return (
        <Drawer title="Filtrele" placement="right" onClose={onClose} open={visible} width={350}
            footer={<Space style={{ width: '100%', justifyContent: 'flex-end' }}><Button onClick={handleClear}>Temizle</Button><Button type="primary" onClick={handleApply}>Uygula</Button></Space>}
        >
            <Form form={form} layout="vertical">
                <Form.Item label="Açıklamada Ara" name="description"><Input placeholder="Açıklamada ara..." /></Form.Item>
                <Form.Item label="Tarih Aralığı" name="date_range"><RangePicker style={{ width: "100%" }} format="DD/MM/YYYY" /></Form.Item>
                <Form.Item label="Durum" name="status">
                    <Select mode="multiple" allowClear placeholder="Durum seçin">
                        {Object.entries(config.statusMap).map(([key, { text }]) => <Select.Option key={key} value={key}>{text}</Select.Option>)}
                    </Select>
                </Form.Item>
                {config.list.filters.map(filter => (
                    <Form.Item label={filter.label} name={filter.id} key={filter.id}>
                        <Select mode="multiple" allowClear placeholder={`${filter.label} seçin`}>
                            {(dropdownData[filter.id] || []).map(item => <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>)}
                        </Select>
                    </Form.Item>
                ))}
            </Form>
        </Drawer>
    );
};

export default function TransactionList({
  config,
  data,
  pagination,
  filters,
  sortInfo,
  loading,
  error,
  handleTableChange,
  applyFilters,
  handleCreate,
}) {
  const { openModal } = useTransactionDetail();
  const [isNewModalVisible, setIsNewModalVisible] = useState(false);
  const [isFilterDrawerVisible, setIsFilterDrawerVisible] = useState(false);

  const initialColumns = [
    { title: "Açıklama", dataIndex: "description", key: "description", width: 300,
      render: (text, record) => (
        <Space>
          {record.group && <Tooltip title={`Grup: ${record.group.name}`}><RetweetOutlined style={{ color: 'rgba(0, 0, 0, 0.45)' }} /></Tooltip>}
          {text}
        </Space>
      )
    },
    ...config.list.columns,
    { title: "Durum", dataIndex: "status", key: "status", sorter: true, sortOrder: sortInfo.field === 'status' && sortInfo.order, width: 130, render: (status) => getStatusTag(status, config.statusMap) },
    { title: "Tarih", dataIndex: "date", key: "date", sorter: true, sortOrder: sortInfo.field === 'date' && sortInfo.order, width: 120, render: (val) => dayjs(val).format('DD/MM/YYYY') },
  ];

  const [columns, setColumns] = useState(initialColumns);

  const handleResize = (index) => (e, { size }) => {
    const nextColumns = [...columns];
    nextColumns[index] = { ...nextColumns[index], width: size.width };
    setColumns(nextColumns);
  };

  const mergedColumns = columns.map((col, index) => ({
    ...col,
    onHeaderCell: (column) => ({ width: column.width, onResize: handleResize(index) }),
  }));

  const activeFilterCount = Object.values(filters).filter(v => v && (!Array.isArray(v) || v.length > 0)).length;

  const handleFinishCreate = async (values, isGroup) => {
      await handleCreate(values, isGroup);
      setIsNewModalVisible(false);
  }

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>{config.title} Listesi</Title>
        <Space>
          <Badge count={activeFilterCount}><Button icon={<FilterOutlined />} onClick={() => setIsFilterDrawerVisible(true)}>Filtrele</Button></Badge>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsNewModalVisible(true)}>Yeni {config.title.slice(0, -1)}</Button>
        </Space>
      </Row>

      <FilterDrawer visible={isFilterDrawerVisible} onClose={() => setIsFilterDrawerVisible(false)} config={config} onApply={applyFilters} initialFilters={filters} />

      {error && <Alert message={error} type="error" style={{ margin: '16px 0' }} showIcon />}
      
      <Spin spinning={loading}>
        <Table
          bordered
          components={{ header: { cell: ResizableTitle } }}
          columns={mergedColumns}
          dataSource={data}
          rowKey="id"
          pagination={pagination}
          onChange={handleTableChange}
          rowClassName={config.rowClassName}
          onRow={(record) => ({ onClick: () => openModal(record.id), style: { cursor: "pointer" } })}
        />
      </Spin>

      <Modal title={`Yeni ${config.title.slice(0, -1)} Ekle`} open={isNewModalVisible} onCancel={() => setIsNewModalVisible(false)} destroyOnClose footer={null}>
        <TransactionForm config={config} onFinish={handleFinishCreate} onCancel={() => setIsNewModalVisible(false)} />
      </Modal>
    </div>
  );
}