import React, { useState, useEffect, useCallback } from 'react';
import { Spin, Alert, Row } from "antd";
import { getExpenseReport, getIncomeReport } from '../../../api/dashboardService';
import { useExpenseDetail } from '../../../context/ExpenseDetailContext';
import { useIncomeDetail } from '../../../context/IncomeDetailContext';
import DashboardControls from './summary/DashboardControls';
import SummaryCategoryCard from './summary/SummaryCategoryCard';
import DetailsModal from './summary/DetailsModal';
import {
  paymentTableColumns,
  expenseTableColumns,
  receiptTableColumns,
  incomeTableColumns,
} from './summary/constants';
import './SummaryCharts.css';

export default function SummaryCharts() {
  const [expenseReport, setExpenseReport] = useState({ summary: {}, details: [] });
  const [incomeReport, setIncomeReport] = useState({ summary: {}, details: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('monthly');

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', data: [], columns: [] });
  const [modalType, setModalType] = useState(null);

  const { openExpenseModal } = useExpenseDetail();
  const { openIncomeModal } = useIncomeDetail();

  const fetchData = useCallback(async (signal) => {
    try {
      setLoading(true);
      const [expenseData, incomeData] = await Promise.all([
        getExpenseReport(currentDate, viewMode, { signal }),
        getIncomeReport(currentDate, viewMode, { signal })
      ]);
      setExpenseReport(expenseData);
      setIncomeReport(incomeData);
    } catch (err) {
      if (err.name !== 'CanceledError') {
        setError(`Veriler yüklenemedi: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [currentDate, viewMode]);

  useEffect(() => {
    const abortController = new AbortController();
    fetchData(abortController.signal);
    return () => abortController.abort();
  }, [fetchData]);

  const handleDateChange = (direction) => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      if (viewMode === 'monthly') {
        newDate.setDate(1);
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
      } else {
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
      }
      return newDate;
    });
  };

  const handleCardClick = (type, title) => {
    setIsModalVisible(true);
    setModalType(type);
    
    let formattedDetails = [];
    let currentColumns = [];

    if (type === 'paid') {
      const allPayments = expenseReport.details.flatMap(e => e.payments || []);
      formattedDetails = allPayments.map(payment => ({
          key: `payment-${payment.id}`,
          id: payment.id,
          expense_id: payment.expense_id,
          description: payment.expense?.description || 'Genel Ödeme',
          region: payment.expense?.region?.name || '-',
          account_name: payment.expense?.account_name?.name || '-',
          budget_item: payment.expense?.budget_item?.name || '-',
          amount: payment.payment_amount,
          date: new Date(payment.payment_date).toLocaleDateString('tr-TR'),
          status: payment.expense?.status, // Correctly access nested status
      }));
      currentColumns = paymentTableColumns;
    } else if (type === 'expense_remaining') {
      const detailsToShow = expenseReport.details.filter(e => e.remaining_amount > 0);
      formattedDetails = detailsToShow.map(item => ({
        ...item, 
        key: item.id, 
        expense_id: item.id,
        region: item.region?.name || '-',
        account_name: item.account_name?.name || '-',
        budget_item: item.budget_item?.name || '-',
        amount: item.remaining_amount,
        date: new Date(item.date).toLocaleDateString('tr-TR'),
      }));
      currentColumns = expenseTableColumns.map(col => col.key === 'amount' ? { ...col, title: 'Kalan Tutar' } : col);
    } else if (type === 'received') {
      const allReceipts = incomeReport.details.flatMap(i => i.receipts || []);
      formattedDetails = allReceipts.map(receipt => ({
          key: `receipt-${receipt.id}`,
          id: receipt.id,
          income_id: receipt.income_id,
          company_name: receipt.income?.company?.name || '-',
          region: receipt.income?.region?.name || '-',
          account_name: receipt.income?.account_name?.name || '-',
          budget_item: receipt.income?.budget_item?.name || '-',
          income_description: receipt.income?.description || 'Gelir Açıklaması Yok',
          amount: receipt.receipt_amount,
          date: new Date(receipt.receipt_date).toLocaleDateString('tr-TR'),
          status: receipt.income?.status, // Correctly access nested status
      }));
      currentColumns = receiptTableColumns;
    } else if (type === 'income_remaining') {
      const detailsToShow = incomeReport.details.filter(i => i.remaining_amount > 0);
      formattedDetails = detailsToShow.map(item => ({
          ...item, key: item.id, income_id: item.id,
          company_name: item.company?.name || '-',
          region: item.region?.name || '-',
          account_name: item.account_name?.name || '-',
          budget_item: item.budget_item?.name || '-',
          income_description: item.description || 'Gelir Açıklaması Yok',
          amount: item.remaining_amount,
          date: new Date(item.date).toLocaleDateString('tr-TR'),
          status: item.status,
      }));
      currentColumns = incomeTableColumns.map(col => col.key === 'amount' ? { ...col, title: 'Kalan Tutar' } : col);
    }
    
    setModalContent({ title: `${title} Listesi`, data: formattedDetails, columns: currentColumns });
  };

  const handleRowClick = (record) => {
    const onBack = () => setIsModalVisible(true);
    if (modalType === 'paid' || modalType === 'expense_remaining') {
      if (record.expense_id) {
        setIsModalVisible(false);
        openExpenseModal(record.expense_id, onBack);
      }
    } else if (modalType === 'received' || modalType === 'income_remaining') {
      if (record.income_id) {
        setIsModalVisible(false);
        openIncomeModal(record.income_id, onBack);
      }
    }
  };

  const getRowClassName = (record) => {
    // This function now correctly evaluates the status passed in the record,
    // which for payments/receipts is the status of their parent expense/income.
    switch (record.status) {
      case 'PAID':
      case 'RECEIVED':
        return 'row-is-complete';
      case 'PARTIALLY_PAID':
      case 'PARTIALLY_RECEIVED':
        return 'row-is-partial';
      case 'UNPAID':
      case 'UNRECEIVED':
        return 'row-is-danger';
      default:
        return '';
    }
  };

  if (error) return <Alert message={error} type="error" showIcon closable />;

  const expenseSummary = {
    total: expenseReport.summary?.total_expenses,
    paid: expenseReport.summary?.total_payments,
    remaining: expenseReport.summary?.total_expense_remaining,
  };

  const incomeSummary = {
    total: incomeReport.summary?.total_income,
    paid: incomeReport.summary?.total_received,
    remaining: incomeReport.summary?.total_income_remaining,
  };

  const formatDisplayDate = (date) =>
    viewMode === 'monthly'
      ? new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(date)
      : new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);

  return (
    <>
      <DashboardControls
        currentDate={currentDate}
        viewMode={viewMode}
        loading={loading}
        onDateChange={handleDateChange}
        onViewModeChange={setViewMode}
      />
      <Spin spinning={loading}>
        <Row gutter={[24, 24]}>
          <SummaryCategoryCard
            title="Gider Özeti"
            summary={expenseSummary}
            onCardClick={handleCardClick}
            type="expense"
          />
          <SummaryCategoryCard
            title="Gelir Özeti"
            summary={incomeSummary}
            onCardClick={handleCardClick}
            type="income"
          />
        </Row>
      </Spin>
      <DetailsModal
        isVisible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        modalContent={modalContent}
        isLoading={false} // Loading is handled by the main component's spinner
        onRowClick={handleRowClick}
        getRowClassName={getRowClassName}
      />
    </>
  );
}



