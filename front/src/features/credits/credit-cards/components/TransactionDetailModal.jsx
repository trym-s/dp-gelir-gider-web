import React, { useState, useMemo } from 'react';
import { Modal, Table, Tag, Typography, Input, Row, Col, Statistic, DatePicker, Popover, Button } from 'antd';
import { formatCurrency } from '../utils/cardUtils';
import dayjs from 'dayjs';
import { useDebounce } from '../../../../hooks/useDebounce';
import { CalendarOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;

const TransactionDetailModal = ({ visible, onCancel, transactions }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [isPopoverVisible, setIsPopoverVisible] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    if (debouncedSearchTerm) {
      filtered = filtered.filter(transaction =>
        transaction.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }

    if (dateRange && dateRange[0] && dateRange[1]) {
        const [startDate, endDate] = dateRange;
        filtered = filtered.filter(transaction => {
            const transactionDate = dayjs(transaction.transaction_date);
            return transactionDate.isAfter(startDate.startOf('day')) && transactionDate.isBefore(endDate.endOf('day'));
        });
    }

    return filtered;
  }, [transactions, debouncedSearchTerm, dateRange]);

  const summary = useMemo(() => {
    return filteredTransactions.reduce((acc, curr) => {
      const amount = parseFloat(curr.amount) || 0;
      const type = curr.type.toLowerCase();
      if (type === 'expense') {
        acc.totalExpense += amount;
      } else if (type === 'payment') {
        acc.totalPayment += amount;
      }
      return acc;
    }, { totalExpense: 0, totalPayment: 0 });
  }, [filteredTransactions]);

  const getHighlightedText = (text, highlight) => {
    if (!highlight.trim()) {
      return <span>{text}</span>;
    }
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
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

  const columns = [
    {
      title: 'Tarih',
      dataIndex: 'transaction_date',
      key: 'transaction_date',
      sorter: (a, b) => dayjs(a.transaction_date).unix() - dayjs(b.transaction_date).unix(),
      render: (text) => dayjs(text).format('DD/MM/YYYY'),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Açıklama',
      dataIndex: 'description',
      key: 'description',
      render: (text) => getHighlightedText(text, debouncedSearchTerm),
    },
    {
      title: 'Tutar',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      sorter: (a, b) => a.amount - b.amount,
      render: (amount, record) => (
        <Text style={{ color: record.type.toLowerCase() === 'expense' ? '#cf1322' : '#389e0d', fontWeight: 500 }}>
          {record.type.toLowerCase() === 'expense' ? '-' : '+'}
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: 'İşlem Tipi',
      dataIndex: 'type',
      key: 'type',
      filters: [
        { text: 'Harcama', value: 'expense' },
        { text: 'Ödeme', value: 'payment' },
      ],
      onFilter: (value, record) => record.type.toLowerCase().indexOf(value) === 0,
      render: (type) => (
        <Tag color={type.toLowerCase() === 'expense' ? 'volcano' : 'green'}>
          {type.toLowerCase() === 'expense' ? 'Harcama' : 'Ödeme'}
        </Tag>
      ),
    },
    {
        title: 'Taksit',
        dataIndex: 'installments',
        key: 'installments',
        align: 'center',
        render: (installments, record) => {
            if (record.type.toLowerCase() === 'payment' || !installments || installments <= 1) {
                return <Tag>Tek Çekim</Tag>;
            }
            return <Tag color="blue">{`${record.current_installment || 1} / ${installments}`}</Tag>;
        }
    }
  ];

  const dateFilterContent = (
    <RangePicker 
        style={{ width: '100%' }}
        onChange={(dates) => setDateRange(dates)}
        format="DD/MM/YYYY"
        value={dateRange}
    />
  );

  return (
    <Modal
      title={<Title level={4}>Tüm İşlem Detayları</Title>}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={1200}
      centered
    >
      <Row gutter={[16, 24]} style={{ marginBottom: 24 }} align="middle">
        <Col xs={24} sm={10}>
            <Search
                placeholder="Açıklama metninde ara..."
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%' }}
                allowClear
                enterButton
            />
        </Col>
        <Col xs={24} sm={4}>
            <Popover
                content={dateFilterContent}
                title="Tarih Aralığı Seçin"
                trigger="click"
                open={isPopoverVisible}
                onOpenChange={setIsPopoverVisible}
                placement="bottom"
            >
                <Button icon={<CalendarOutlined />} style={{ width: '100%' }}>
                    {dateRange ? `${dayjs(dateRange[0]).format('DD/MM')} - ${dayjs(dateRange[1]).format('DD/MM')}` : 'Tarih Filtresi'}
                </Button>
            </Popover>
        </Col>
        <Col xs={24} sm={10}>
            <Row gutter={16}>
                <Col span={8}>
                    <Statistic title="Toplam İşlem" value={filteredTransactions.length} />
                </Col>
                <Col span={8}>
                    <Statistic title="Toplam Harcama" value={formatCurrency(summary.totalExpense)} valueStyle={{ color: '#cf1322' }} />
                </Col>
                <Col span={8}>
                    <Statistic title="Toplam Ödeme" value={formatCurrency(summary.totalPayment)} valueStyle={{ color: '#389e0d' }} />
                </Col>
            </Row>
        </Col>
      </Row>
      
      <Table
        columns={columns}
        dataSource={filteredTransactions}
        rowKey="id"
        pagination={{ pageSize: 10, showSizeChanger: true }}
        scroll={{ y: 400 }}
        locale={{
            emptyText: <Text type="secondary">Arama kriterlerinize uygun işlem bulunamadı.</Text>
        }}
      />
    </Modal>
  );
};

export default TransactionDetailModal;