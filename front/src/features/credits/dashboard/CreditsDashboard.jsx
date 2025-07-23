// /front/src/features/credits/dashboard/CreditsDashboard.jsx
import React from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Spin, Row, Col } from 'antd';
import BankLogsSummary from './BankLogsSummary';
import CreditCardsSummary from './CreditCardsSummary';
import LoansSummary from './LoansSummary';
import { getBankLogsByDate } from '../../../api/bankService';
import { getCreditCards } from '../../../api/creditCardService';
import { getLoans } from '../../../api/loanService';

const queryClient = new QueryClient();

const formatDate = (date) => {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
};

function CreditsDashboard() {
  const { data: bankLogs, isLoading: isLoadingBankLogs } = useQuery({
    queryKey: ['bankLogs', formatDate(new Date())],
    queryFn: () => getBankLogsByDate(formatDate(new Date())),
  });

  const { data: creditCards, isLoading: isLoadingCreditCards } = useQuery({
    queryKey: ['creditCards'],
    queryFn: getCreditCards,
  });

  const { data: loans, isLoading: isLoadingLoans } = useQuery({
    queryKey: ['loans'],
    queryFn: getLoans,
  });

  const isLoading = isLoadingBankLogs || isLoadingCreditCards || isLoadingLoans;

  return (
    <div>
      <h1>Krediler Dashboard</h1>
      {isLoading ? (
        <Spin size="large" />
      ) : (
        <Row gutter={16}>
          <Col span={8}>
            <BankLogsSummary data={bankLogs} isLoading={isLoadingBankLogs} />
          </Col>
          <Col span={8}>
            <CreditCardsSummary data={creditCards} isLoading={isLoadingCreditCards} />
          </Col>
          <Col span={8}>
            <LoansSummary data={loans} isLoading={isLoadingLoans} />
          </Col>
        </Row>
      )}
    </div>
  );
}

export default function ProvidedCreditsDashboard() {
  return (
    <QueryClientProvider client={queryClient}>
      <CreditsDashboard />
    </QueryClientProvider>
  );
}
