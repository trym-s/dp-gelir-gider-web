import React, { useState, useEffect } from 'react';
import { Card, Spin, Alert, Row, Modal, Table } from "antd";
import { getDashboardSummary, getExpenseDetails, getIncomeDetails } from '../../../api/dashboardService';
import CircularProgressCard from './CircularProgressCard';
import './SummaryCharts.css';

// Helper function for currency formatting
const formatCurrency = (value) => {
    if (value == null) return "0,00 ₺";
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
};

export default function SummaryCharts() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for the modal
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', data: [] });
  const [isModalLoading, setIsModalLoading] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const data = await getDashboardSummary();
        setSummary(data);
      } catch (err) {
        const errorMessage = err.response ? JSON.stringify(err.response.data) : err.message;
        setError(`Summary data could not be loaded: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  // Function to handle card clicks
  const handleCardClick = async (type, title) => {
    // Return early if the card is a "Total" card
    if (type === 'total') return;

    setIsModalVisible(true);
    setIsModalLoading(true);
    setModalContent({ title: `${title} List`, data: [] });

    try {
        let details;
        if (type === 'paid') {
            details = await getExpenseDetails('paid');
        } else if (type === 'expense_remaining') {
            details = await getExpenseDetails('remaining');
        } else if (type === 'received') {
            details = await getIncomeDetails('received');
        } else if (type === 'income_remaining') {
            details = await getIncomeDetails('remaining');
        }
        
        setModalContent(prev => ({ ...prev, data: details }));
    } catch (apiError) {
        console.error("Error fetching details:", apiError);
        // Optionally, show an error message in the modal
        setModalContent(prev => ({ ...prev, data: [] })); 
    } finally {
        setIsModalLoading(false);
    }
  };

  // Table columns definition
  const tableColumns = [
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Date', dataIndex: 'date', key: 'date', width: 120 },
    { 
      title: 'Amount', 
      dataIndex: 'amount', 
      key: 'amount', 
      render: (text) => formatCurrency(text),
      align: 'right',
      width: 150
    }
  ];

  if (loading) {
    return <Row justify="center" align="middle" style={{ minHeight: '200px' }}><Spin size="large" /></Row>;
  }

  if (error) {
    return <Alert message={error} type="error" showIcon closable />;
  }

  const {
    total_expenses = 0,
    total_payments = 0,
    total_expense_remaining = 0,
    total_income = 0,
    total_received = 0,
    total_income_remaining = 0,
  } = summary || {};

  // Expense Percentages
  const expensePaidPercentage = total_expenses > 0 ? (total_payments / total_expenses) * 100 : 0;
  const expenseRemainingPercentage = total_expenses > 0 ? (total_expense_remaining / total_expenses) * 100 : 0;

  // Income Percentages
  const incomeReceivedPercentage = total_income > 0 ? (total_received / total_income) * 100 : 0;
  const incomeRemainingPercentage = total_income > 0 ? (total_income_remaining / total_income) * 100 : 0;
  
  return (
    <>
      {/* EXPENSE SUMMARY CARD */}
      <Card title="This Month's Expense Summary" bordered={false} style={{ marginBottom: '24px' }}>
        <div className="summary-card-container">
          <CircularProgressCard
            title="Ödenen"
            percentage={expensePaidPercentage}
            text={`${Math.round(expensePaidPercentage)}%`}
            amount={total_payments}
            color="#4caf50" // Green
            onClick={() => handleCardClick('paid', 'Yapılan Ödemeler')}
          />
          <CircularProgressCard
            title="Ödenecek Kalan"
            percentage={expenseRemainingPercentage}
            text={`${Math.round(expenseRemainingPercentage)}%`}
            amount={total_expense_remaining}
            color="#f44336" // Red
            onClick={() => handleCardClick('expense_remaining', 'Ödenecek Giderler')}
          />
          <CircularProgressCard
            title="Toplam Gider"
            percentage={100}
            text="Tümü"
            amount={total_expenses}
            color="#2196f3" // Blue
            onClick={() => handleCardClick('total', '')} // Non-clickable
          />
        </div>
      </Card>

      {/* INCOME SUMMARY CARD */}
      <Card title="This Month's Income Summary" bordered={false}>
        <div className="summary-card-container">
          <CircularProgressCard
            title="Alınan"
            percentage={incomeReceivedPercentage}
            text={`${Math.round(incomeReceivedPercentage)}%`}
            amount={total_received}
            color="#00acc1" // Turquoise
            onClick={() => handleCardClick('received', 'Alınan Gelirler')}
          />
          <CircularProgressCard
            title="Alınacak Kalan"
            percentage={incomeRemainingPercentage}
            text={`${Math.round(incomeRemainingPercentage)}%`}
            amount={total_income_remaining}
            color="#ff9800" // Orange
            onClick={() => handleCardClick('income_remaining', 'Alınacak Gelirler')}
          />
          <CircularProgressCard
            title="Toplam Gelir"
            percentage={100}
            text="Tümü"
            amount={total_income}
            color="#673ab7" // Purple
            onClick={() => handleCardClick('total', '')} // Non-clickable
          />
        </div>
      </Card>

      {/* DETAILS MODAL */}
      <Modal
        title={modalContent.title}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={800}
        destroyOnClose
      >
        {isModalLoading ? (
          <Row justify="center" align="middle" style={{ padding: '50px' }}>
            <Spin size="large" />
          </Row>
        ) : (
          <Table
            columns={tableColumns}
            dataSource={modalContent.data}
            rowKey="id"
            pagination={{ pageSize: 7 }}
          />
        )}
      </Modal>
    </>
  );
}