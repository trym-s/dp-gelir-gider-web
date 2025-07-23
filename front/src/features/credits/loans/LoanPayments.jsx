import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { List, Spin, Typography, Tag, Alert, Empty } from 'antd';
import dayjs from 'dayjs';
import { getPaymentsForLoan } from '../../../api/loanService';

const { Text } = Typography;

const paymentTypeDisplay = {
  REGULAR_INSTALLMENT: "Normal Taksit",
  PREPAYMENT: "Ara Ödeme",
  SETTLEMENT: "Erken Kapama Ödemesi",
  OTHER: "Diğer"
};

const currencyFormatter = (value) => 
  `₺${parseFloat(value).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Komponent artık sadece ödeme geçmişini göstermekle sorumlu
const LoanPayments = ({ loanId }) => {
  const { data: paymentsData, isLoading: isLoadingPayments, isError: isErrorPayments } = useQuery({
    queryKey: ['loanPayments', loanId],
    queryFn: () => getPaymentsForLoan(loanId),
    enabled: !!loanId,
    select: (response) => response.data,
  });

  if (isLoadingPayments) {
    return <div style={{textAlign: 'center', padding: '20px'}}><Spin /></div>;
  }
  
  if (isErrorPayments) {
      return <Alert message="Hata" description="Ödeme geçmişi verileri yüklenemedi." type="error" showIcon />;
  }

  const payments = paymentsData?.data || [];

  if (payments.length === 0) {
    return <Empty description="Bu kredi için henüz ödeme yapılmamış." />;
  }

  return (
    <List
      dataSource={payments}
      renderItem={item => (
        <List.Item>
          <List.Item.Meta
            title={<Text strong>{currencyFormatter(item.amount_paid)}</Text>}
            description={
              `Tarih: ${dayjs(item.payment_date).format('DD.MM.YYYY')} ` +
              (item.installment_number ? `| Taksit #${item.installment_number}` : '')
            }
          />
          <Tag color="blue">{paymentTypeDisplay[item.payment_type] || item.payment_type}</Tag>
        </List.Item>
      )}
    />
  );
};

export default LoanPayments;