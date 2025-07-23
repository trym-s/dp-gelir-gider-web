import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Spin, Alert, Tag, Typography } from 'antd';
import { getLoans } from '../../../api/loanService';
import dayjs from 'dayjs';
import PaymentHistoryTable from './PaymentHistoryTable'; // Ödeme geçmişi tablosunu import et

const { Text } = Typography;

const currencyFormatter = (value) => 
  `₺${parseFloat(value).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusConfig = {
  ACTIVE: { color: 'blue', text: 'Aktif' },
  PAID_IN_FULL: { color: 'green', text: 'Tamamen Ödendi' },
  OVERDUE: { color: 'red', text: 'Vadesi Geçmiş' },
  PENDING_APPROVAL: { color: 'gold', text: 'Onay Bekliyor' },
  DEFAULTED: { color: 'volcano', text: 'Takibe Düştü' },
};

const LoansTable = () => {
  const { data: loans = [], isLoading, isError } = useQuery({
    queryKey: ['loans'], // Use the same key to get cached data
    queryFn: getLoans,
    select: (data) => data.data,
  });

  const columns = [
    {
      title: 'Kredi Adı',
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
      title: 'Kredi Türü',
      dataIndex: ['loan_type', 'name'],
      key: 'loan_type',
    },
    {
      title: 'Çekilen Tutar',
      dataIndex: 'amount_drawn',
      key: 'amount_drawn',
      align: 'right',
      render: currencyFormatter,
      sorter: (a, b) => a.amount_drawn - b.amount_drawn,
    },
    {
      title: 'Kalan Anapara',
      dataIndex: 'remaining_principal',
      key: 'remaining_principal',
      align: 'right',
      render: currencyFormatter,
      sorter: (a, b) => a.remaining_principal - b.remaining_principal,
    },
    {
      title: 'Aylık Taksit',
      dataIndex: 'monthly_payment_amount',
      key: 'monthly_payment_amount',
      align: 'right',
      render: currencyFormatter,
      sorter: (a, b) => a.monthly_payment_amount - b.monthly_payment_amount,
    },
    {
      title: 'Vade (Ay)',
      dataIndex: 'term_months',
      key: 'term_months',
      align: 'center',
      sorter: (a, b) => a.term_months - b.term_months,
    },
    {
      title: 'Aylık Faiz',
      dataIndex: 'monthly_interest_rate',
      key: 'monthly_interest_rate',
      align: 'center',
      render: (rate) => `${(rate * 100).toFixed(2)}%`,
      sorter: (a, b) => a.monthly_interest_rate - b.monthly_interest_rate,
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
    {
      title: 'Çekim Tarihi',
      dataIndex: 'date_drawn',
      key: 'date_drawn',
      render: (date) => dayjs(date).format('DD.MM.YYYY'),
      sorter: (a, b) => dayjs(a.date_drawn).unix() - dayjs(b.date_drawn).unix(),
    },
  ];

  if (isLoading) return <div style={{ textAlign: 'center', margin: '50px 0' }}><Spin size="large" /></div>;
  if (isError) return <Alert message="Veriler yüklenirken bir hata oluştu." type="error" />;

  return (
    <Table
      columns={columns}
      dataSource={loans.map(loan => ({ ...loan, key: loan.id }))}
      scroll={{ x: 'max-content' }}
      size="small"
      expandable={{
        expandedRowRender: (record) => <PaymentHistoryTable loanId={record.id} />,
        rowExpandable: (record) => true, // Optionally, you can disable this for loans with 0 payments
      }}
    />
  );
};

export default LoansTable;
