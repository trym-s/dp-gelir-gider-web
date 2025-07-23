import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Spin, Alert, Tag, Typography } from 'antd';
import { getPaymentsForLoan } from '../../../api/loanService';
import dayjs from 'dayjs';

const { Text } = Typography;

const currencyFormatter = (value) => 
  `₺${parseFloat(value).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const paymentTypeDisplay = {
  REGULAR_INSTALLMENT: "Normal Taksit",
  PREPAYMENT: "Ara Ödeme",
  SETTLEMENT: "Erken Kapama Ödemesi",
  OTHER: "Diğer"
};

const PaymentHistoryTable = ({ loanId }) => {
  const { data: paymentsData, isLoading, isError } = useQuery({
    queryKey: ['loanPayments', loanId],
    queryFn: () => getPaymentsForLoan(loanId),
    select: (response) => response.data.data, // Select the array of payments
  });

  const columns = [
    {
      title: 'Ödeme Tarihi',
      dataIndex: 'payment_date',
      key: 'payment_date',
      render: (date) => dayjs(date).format('DD.MM.YYYY'),
    },
    {
      title: 'Ödenen Tutar',
      dataIndex: 'amount_paid',
      key: 'amount_paid',
      align: 'right',
      render: currencyFormatter,
    },
    {
      title: 'Ödeme Türü',
      dataIndex: 'payment_type',
      key: 'payment_type',
      align: 'center',
      render: (type) => <Tag color="blue">{paymentTypeDisplay[type] || type}</Tag>,
    },
    {
      title: 'Notlar',
      dataIndex: 'notes',
      key: 'notes',
    },
    {
      title: 'İlişkili Taksit',
      dataIndex: 'installment_number',
      key: 'installment_number',
      align: 'center',
      render: (num) => num ? `#${num}` : '-',
    },
  ];

  if (isLoading) return <div style={{ padding: '20px', textAlign: 'center' }}><Spin /></div>;
  if (isError) return <Alert message="Ödeme geçmişi yüklenemedi." type="warning" showIcon />;

  return (
    <Table
      columns={columns}
      dataSource={paymentsData.map(p => ({ ...p, key: p.id }))}
      pagination={false}
      size="small"
    />
  );
};

export default PaymentHistoryTable;
