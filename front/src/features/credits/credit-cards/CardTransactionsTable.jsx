import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Spin, Alert, Tag, Typography } from 'antd';
import { getTransactionsForCard } from '../../../api/creditCardService';
import dayjs from 'dayjs';

const { Text } = Typography;

const currencyFormatter = (value) =>
  `₺${parseFloat(value).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const transactionTypeDisplay = {
  EXPENSE: "Harcama",
  PAYMENT: "Ödeme",
};

const CardTransactionsTable = ({ cardId }) => {
  const { data: transactionsData = [], isLoading, isError } = useQuery({
    queryKey: ['cardTransactions', cardId],
    queryFn: () => getTransactionsForCard(cardId),
  });

  const columns = [
    {
      title: 'İşlem Tarihi',
      dataIndex: 'transaction_date',
      key: 'transaction_date',
      render: (date) => dayjs(date).format('DD.MM.YYYY'),
    },
    {
      title: 'İşlem Türü',
      dataIndex: 'transaction_type',
      key: 'transaction_type',
      align: 'center',
      render: (type) => {
        if (typeof type !== 'string') {
          return <Tag color="gray">Bilinmiyor</Tag>;
        }
        const upperType = type.toUpperCase();
        const color = upperType === 'EXPENSE' ? 'red' : 'green';
        const text = transactionTypeDisplay[upperType] || type;
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: 'Tutar',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: currencyFormatter,
    },
    {
      title: 'Açıklama',
      dataIndex: 'description',
      key: 'description',
    },
  ];

  if (isLoading) return <div style={{ padding: '20px', textAlign: 'center' }}><Spin /></div>;
  if (isError) return <Alert message="İşlem geçmişi yüklenemedi." type="warning" showIcon />;

  return (
    <Table
      columns={columns}
      dataSource={transactionsData.map(t => ({ ...t, key: t.id }))}
      pagination={false}
      size="small"
    />
  );
};

export default CardTransactionsTable;
