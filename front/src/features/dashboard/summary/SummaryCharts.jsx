import React, { useState, useEffect, useCallback } from 'react';
import { Spin, Alert, Row, Col, Divider, Button } from "antd";
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { getExpenseReport, getIncomeReport } from '../../../api/dashboardService';
import { useExpenseDetail } from '../../../context/ExpenseDetailContext';
import { useIncomeDetail } from '../../../context/IncomeDetailContext';
import { useDashboard } from '../../../context/DashboardContext';
import DashboardControls from './DashboardControls';
import SummaryCategoryCard from './SummaryCategoryCard';
import DetailsModal from './DetailsModal';
import ExpenseChart from '../charts/ExpenseChart';
import IncomeChart from '../charts/IncomeChart';
import CombinedIncomeExpenseChart from '../charts/CombinedIncomeExpenseChart';
import {
  paymentTableColumns,
  expenseTableColumns,
  receiptTableColumns,
  incomeTableColumns,
} from './constants';
import '../styles/SummaryCharts.css';

const getDateRange = (date, viewMode) => {
  const d = new Date(date);
  let startDate, endDate;

  if (viewMode === 'daily') {
    startDate = new Date(d.setHours(0, 0, 0, 0)).toISOString().split('T')[0];
    endDate = startDate;
  } else if (viewMode === 'weekly') {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(d.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    startDate = startOfWeek.toISOString().split('T')[0];
    endDate = endOfWeek.toISOString().split('T')[0];
  } else { // 'monthly'
    startDate = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  }
  
  return { startDate, endDate };
};

export default function SummaryCharts() {
  const [expenseReport, setExpenseReport] = useState({ summary: {}, details: [] });
  const [incomeReport, setIncomeReport] = useState({ summary: {}, details: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartsVisible, setChartsVisible] = useState(true);
  
  const { currentDate, setCurrentDate, viewMode, setViewMode, refresh } = useDashboard();

  const [isChartModalVisible, setChartModalVisible] = useState(false);
  const [chartModalType, setChartModalType] = useState(null); // 'income' | 'expense'
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', data: [], columns: [] });
  const [modalType, setModalType] = useState(null);

  const { openExpenseModal } = useExpenseDetail();
  const { openIncomeModal } = useIncomeDetail();

  const { startDate, endDate } = getDateRange(currentDate, viewMode);

  const fetchData = useCallback(async (signal) => {
    try {
      setLoading(true);
      const [expenseData, incomeData] = await Promise.all([
        getExpenseReport(startDate, endDate, { signal }),
        getIncomeReport(startDate, endDate, { signal })
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
  }, [startDate, endDate]);

  useEffect(() => {
    const abortController = new AbortController();
    fetchData(abortController.signal);
    return () => abortController.abort();
  }, [fetchData, refresh]);

  const handleDateChange = (direction) => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      if (viewMode === 'monthly') {
        newDate.setDate(1);
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
      } else if (viewMode === 'weekly') {
        const dayIncrement = direction === 'next' ? 7 : -7;
        newDate.setDate(newDate.getDate() + dayIncrement);
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
    if (type === 'expense_total' || type === 'income_total') {
      handleChartOpen(type === 'expense_total' ? 'expense' : 'income');
      return;
    }
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
          status: payment.expense?.status,
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
          status: receipt.income?.status,
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

  const handleChartOpen = (type) => {
    setChartModalVisible(true);
    setChartModalType(type);
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
    <div className="dashboard-container">
      <div className="sticky-controls">
        <DashboardControls
          currentDate={currentDate}
          viewMode={viewMode}
          loading={loading}
          onDateChange={handleDateChange}
          onViewModeChange={setViewMode}
        />
      </div>
      
      <Spin spinning={loading}>
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <SummaryCategoryCard
              title="Gider Özeti"
              summary={expenseSummary}
              onCardClick={handleCardClick}
              type="expense"
            />
          </Col>
          <Col xs={24} lg={12}>
            <SummaryCategoryCard
              title="Gelir Özeti"
              summary={incomeSummary}
              onCardClick={handleCardClick}
              type="income"
            />
          </Col>
        </Row>

        <Divider style={{ marginTop: 24, marginBottom: 24, borderBlockStart: '2px solid var(--divider-color)' }}>
          <Button 
            type="text" 
            icon={chartsVisible ? <UpOutlined /> : <DownOutlined />} 
            onClick={() => setChartsVisible(!chartsVisible)}
            style={{ color: 'var(--text-color-45)' }}
          >
            {chartsVisible ? 'Grafikleri Gizle' : 'Grafikleri Göster'}
          </Button>
        </Divider>

        {chartsVisible && (
          <>
            <Row gutter={[24, 24]}>
              <Col xs={24} lg={12}>
                <ExpenseChart startDate={startDate} endDate={endDate} />
              </Col>
              <Col xs={24} lg={12}>
                <IncomeChart startDate={startDate} endDate={endDate} />
              </Col>
            </Row>
            <Row style={{ marginTop: 24 }}>
              <Col span={24}>
                <CombinedIncomeExpenseChart startDate={startDate} endDate={endDate} />
              </Col>
            </Row>
          </>
        )}
      </Spin>

      <DetailsModal
        isVisible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        modalContent={modalContent}
        isLoading={false}
        onRowClick={handleRowClick}
        getRowClassName={getRowClassName}
      />
    </div>
  );
}