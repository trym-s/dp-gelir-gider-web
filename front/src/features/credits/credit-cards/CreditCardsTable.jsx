import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Spin, Alert, Tag, Typography } from 'antd';
import { getCreditCards } from '../../../api/creditCardService';
import CardTransactionsTable from './CardTransactionsTable';
import dayjs from 'dayjs';

const { Text } = Typography;

const safeCurrencyFormatter = (value) => {
  const number = parseFloat(value);
  if (isNaN(number)) {
    return '₺0,00';
  }
  return `₺${number.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const statusConfig = {
  ACTIVE: { color: 'blue', text: 'Aktif' },
  CANCELLED: { color: 'red', text: 'İptal Edildi' },
  PENDING_ACTIVATION: { color: 'gold', text: 'Aktivasyon Bekliyor' },
};

const CreditCardsTable = () => {
  const { data: creditCards = [], isLoading, isError } = useQuery({
    queryKey: ['creditCards'],
    queryFn: getCreditCards,
    // The service returns the array directly, so no 'select' is needed.
  });

  const columns = [
    {
      title: 'Kart Adı',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Banka',
      dataIndex: ['bank_account', 'bank', 'name'],
      key: 'bank',
      sorter: (a, b) => a.bank_account.bank.name.localeCompare(b.bank_account.bank.name),
    },
    {
      title: 'Limit',
      dataIndex: 'credit_limit',
      key: 'credit_limit',
      align: 'right',
      render: (value) => safeCurrencyFormatter(value),
      sorter: (a, b) => (parseFloat(a.credit_limit) || 0) - (parseFloat(b.credit_limit) || 0),
    },
    {
      title: 'Toplam Harcama',
      dataIndex: 'current_debt',
      key: 'current_debt',
      align: 'right',
      render: (value) => safeCurrencyFormatter(value),
      sorter: (a, b) => (parseFloat(a.current_debt) || 0) - (parseFloat(b.current_debt) || 0),
    },
    {
      title: 'Toplam Ödeme',
      key: 'total_payments',
      align: 'right',
      render: (record) => {
        const limit = parseFloat(record.credit_limit) || 0;
        const available = parseFloat(record.available_credit) || 0;
        const debt = parseFloat(record.current_debt) || 0;
        // This logic might need adjustment based on how 'available_credit' is defined.
        // A common scenario is that payments increase available credit.
        // If available_credit = limit - debt + payments, then payments = available_credit - limit + debt.
        // Assuming a simpler model for now:
        const payments = limit - available - debt;
        return safeCurrencyFormatter(payments);
      },
      sorter: (a, b) => {
        const paymentA = (parseFloat(a.credit_limit) || 0) - (parseFloat(a.available_credit) || 0);
        const paymentB = (parseFloat(b.credit_limit) || 0) - (parseFloat(b.available_credit) || 0);
        return paymentA - paymentB;
      },
    },
    {
      title: 'Son Ekstre Tarihi',
      dataIndex: 'statement_date',
      key: 'statement_date',
      align: 'center',
      render: (date) => dayjs(date).format('DD.MM.YYYY'),
      sorter: (a, b) => dayjs(a.statement_date).unix() - dayjs(b.statement_date).unix(),
    },
    {
      title: 'Son Ödeme Tarihi',
      dataIndex: 'payment_due_date',
      key: 'payment_due_date',
      align: 'center',
      render: (date) => dayjs(date).format('DD.MM.YYYY'),
      sorter: (a, b) => dayjs(a.payment_due_date).unix() - dayjs(b.payment_due_date).unix(),
    },
    {
      title: 'Durum',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      render: (status) => {
        const config = statusConfig[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
      filters: Object.entries(statusConfig).map(([key, { text }]) => ({
        text: text,
        value: key,
      })),
      onFilter: (value, record) => record.status === value,
    },
  ];

  if (isLoading) return <div style={{ textAlign: 'center', margin: '50px 0' }}><Spin size="large" /></div>;
  if (isError) return <Alert message="Veriler yüklenirken bir hata oluştu." type="error" />;

  return (
    <Table
      columns={columns}
      dataSource={creditCards.map(card => ({ ...card, key: card.id }))}
      scroll={{ x: 'max-content' }}
      size="small"
      expandable={{
        expandedRowRender: (record) => <CardTransactionsTable cardId={record.id} />,
        rowExpandable: (record) => true,
      }}
    />
  );
};

export default CreditCardsTable;
