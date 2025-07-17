import React, { useState, useEffect, useCallback } from 'react';
import { Spin, Alert, Row, Col, Divider, Button, Skeleton } from "antd";
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
  
  const { 
    currentDate, 
    setCurrentDate, 
    viewMode, 
    setViewMode, 
    debouncedCurrentDate, 
    debouncedViewMode, 
    refresh 
  } = useDashboard();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', data: [], columns: [] });
  const [modalType, setModalType] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const { openExpenseModal } = useExpenseDetail();
  const { openIncomeModal } = useIncomeDetail();

  const { startDate, endDate } = getDateRange(debouncedCurrentDate, debouncedViewMode);

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

  const openDetailsModal = async (title, type, fetcher) => {
    setModalLoading(true);
    setIsModalVisible(true);
    setModalType(type);

    try {
        const report = await fetcher();
        let formattedDetails = [];
        let currentColumns = [];

        if (type === 'paid') {
            formattedDetails = report.details.flatMap(e => e.payments || []).map(p => ({
                ...p, key: `payment-${p.id}`, expense_id: p.expense_id,
                description: p.expense?.description || '-',
                region: p.expense?.region?.name || '-',
                account_name: p.expense?.account_name?.name || '-',
                budget_item: p.expense?.budget_item?.name || '-',
                amount: p.payment_amount,
                date: new Date(p.payment_date).toLocaleDateString('tr-TR'),
                status: p.expense?.status,
            }));
            currentColumns = paymentTableColumns;
        } else if (type === 'expense_remaining' || type === 'expense_by_date' || type === 'expense_by_group') {
            formattedDetails = report.details.map(item => ({
                ...item, key: item.id, expense_id: item.id,
                region: item.region?.name || '-',
                account_name: item.account_name?.name || '-',
                budget_item: item.budget_item?.name || '-',
                amount: item.amount,
                remaining_amount: item.remaining_amount,
                date: new Date(item.date).toLocaleDateString('tr-TR'),
            }));
            currentColumns = expenseTableColumns;
        } else if (type === 'received') {
            formattedDetails = report.details.flatMap(i => i.receipts || []).map(r => ({
                ...r, key: `receipt-${r.id}`, income_id: r.income_id,
                company_name: r.income?.company?.name || '-',
                region: r.income?.region?.name || '-',
                account_name: r.income?.account_name?.name || '-',
                budget_item: r.income?.budget_item?.name || '-',
                amount: r.receipt_amount,
                date: new Date(r.receipt_date).toLocaleDateString('tr-TR'),
                status: r.income?.status,
            }));
            currentColumns = receiptTableColumns;
        } else if (type === 'income_remaining' || type === 'income_by_date' || type === 'income_by_group') {
            formattedDetails = report.details.map(item => ({
                ...item, key: item.id, income_id: item.id,
                company_name: item.company?.name || '-',
                region: item.region?.name || '-',
                account_name: item.account_name?.name || '-',
                budget_item: item.budget_item?.name || '-',
                amount: item.received_amount,
                remaining_amount: item.remaining_amount,
                date: new Date(item.date).toLocaleDateString('tr-TR'),
            }));
            currentColumns = incomeTableColumns.map(col => 
                col.dataIndex === 'total_amount' ? { ...col, title: 'Alınan Tutar' } : col
            );
        }
        
        setModalContent({ title, data: formattedDetails, columns: currentColumns });
    } catch (err) {
        setError('Detay verileri yüklenemedi.');
    } finally {
        setModalLoading(false);
    }
  };

  const handleCardClick = (type, title) => {
    const fetcher = () => type === 'paid' || type === 'expense_remaining'
      ? Promise.resolve(expenseReport)
      : Promise.resolve(incomeReport);
    openDetailsModal(title, type, fetcher);
  };

  const handleChartDateClick = (type, date) => {
    const { startDate, endDate } = getDateRange(date, 'daily');
    const title = `${new Date(date).toLocaleDateString('tr-TR')} Tarihindeki ${type === 'expense' ? 'Giderler' : 'Gelirler'}`;
    const modalType = type === 'expense' ? 'expense_by_date' : 'income_by_date';
    const fetcher = () => type === 'expense' 
      ? getExpenseReport(startDate, endDate) 
      : getIncomeReport(startDate, endDate);
    openDetailsModal(title, modalType, fetcher);
  };

  const handleChartGroupClick = (type, groupBy, groupName) => {
    const title = `${groupName} Grubundaki ${type === 'expense' ? 'Giderler' : 'Gelirler'}`;
    const modalType = type === 'expense' ? 'expense_by_group' : 'income_by_group';
    const fetcher = () => type === 'expense' 
      ? getExpenseReport(startDate, endDate, { groupBy, groupName })
      : getIncomeReport(startDate, endDate, { groupBy, groupName });
    openDetailsModal(title, modalType, fetcher);
  };

  const handleRowClick = (record) => {
    const onBack = () => setIsModalVisible(true);
    if (record.expense_id) {
        setIsModalVisible(false);
        openExpenseModal(record.expense_id, onBack);
    } else if (record.income_id) {
        setIsModalVisible(false);
        openIncomeModal(record.income_id, onBack);
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

  if (error) {
    return <Alert message={error} type="error" showIcon closable />;
  }

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
      
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          {loading ? <Skeleton active paragraph={{ rows: 4 }} /> : 
            <SummaryCategoryCard
              title="Gider Özeti"
              summary={expenseSummary}
              onCardClick={handleCardClick}
              type="expense"
            />
          }
        </Col>
        <Col xs={24} lg={12}>
          {loading ? <Skeleton active paragraph={{ rows: 4 }} /> :
            <SummaryCategoryCard
              title="Gelir Özeti"
              summary={incomeSummary}
              onCardClick={handleCardClick}
              type="income"
            />
          }
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
              <ExpenseChart 
                startDate={startDate} 
                endDate={endDate} 
                onDateClick={(date) => handleChartDateClick('expense', date)}
                onGroupClick={(groupBy, groupName) => handleChartGroupClick('expense', groupBy, groupName)}
              />
            </Col>
            <Col xs={24} lg={12}>
              <IncomeChart 
                startDate={startDate} 
                endDate={endDate} 
                onDateClick={(date) => handleChartDateClick('income', date)}
                onGroupClick={(groupBy, groupName) => handleChartGroupClick('income', groupBy, groupName)}
              />
            </Col>
          </Row>
          <Row style={{ marginTop: 24 }}>
            <Col span={24}>
              <CombinedIncomeExpenseChart startDate={startDate} endDate={endDate} />
            </Col>
          </Row>
        </>
      )}

      <DetailsModal
        isVisible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        modalContent={modalContent}
        isLoading={modalLoading}
        onRowClick={handleRowClick}
        getRowClassName={getRowClassName}
      />
    </div>
  );
}