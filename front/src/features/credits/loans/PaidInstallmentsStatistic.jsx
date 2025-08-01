import React from 'react';
import { Tag, Spin } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getPaymentsForLoan } from '../../../api/loanService';

const PaidInstallmentsStatistic = ({ loanId }) => {
  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ['loanPayments', loanId],
    queryFn: () => getPaymentsForLoan(loanId),
    enabled: !!loanId,
    select: (response) => response.data.data,
  });

  if (isLoading) {
    return <Spin size="xs" />;
  }

  const paidCount = paymentsData?.length || 0;

  return (
    <Tag color="purple">Ödenen Taksit: {paidCount} </Tag>
  );
};

export default PaidInstallmentsStatistic;
