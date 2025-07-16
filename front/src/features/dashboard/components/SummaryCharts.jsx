import React, { useState, useEffect, useCallback } from 'react';
import { Card, Spin, Alert, Row, Modal, Table, Tag, Button, Radio, Col, Typography } from "antd";
import { LeftOutlined, RightOutlined, FilterOutlined } from '@ant-design/icons';
import {
  getDashboardSummary,
  getPaidExpenseDetails,
  getRemainingExpenseDetails,
  getReceivedIncomeDetails,
  getRemainingIncomeDetails
} from '../../../api/dashboardService';
import CircularProgressCard from './CircularProgressCard';
import IncomeChart from './IncomeChart';       // ✅ yeni eklendi
import ExpenseChart from './ExpenseChart';     // ✅ yeni eklendi
import './SummaryCharts.css';

const { Title } = Typography;

const formatCurrency = (value) => {
  if (value == null) return "0,00 ₺";
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
};

const getStatusTag = (status) => {
  const statusMap = {
    'PAID': { color: 'green', text: 'Ödendi' },
    'UNPAID': { color: 'red', text: 'Ödenmedi' },
    'PARTIALLY_PAID': { color: 'orange', text: 'Kısmi Ödendi' },
    'OVERPAID': { color: 'purple', text: 'Fazla Ödendi' },
    'DEFAULT': { color: 'grey', text: '-' },
  };
  const { color, text } = statusMap[status] || { color: 'default', text: status };
  return <Tag color={color}>{text}</Tag>;
};

export default function SummaryCharts() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('monthly');
  const [isControlsVisible, setIsControlsVisible] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', data: [], columns: [] });
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [modalChartType, setModalChartType] = useState(null); // ✅ grafik tipi: 'income' | 'expense'

  const fetchSummary = useCallback(async (signal) => {
    try {
      setLoading(true);
      const data = await getDashboardSummary(currentDate, viewMode, { signal });
      setSummary(data);
    } catch (err) {
      if (err.name !== 'CanceledError') {
        const errorMessage = err.response ? JSON.stringify(err.response.data) : err.message;
        setError(`Özet verileri yüklenemedi: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  }, [currentDate, viewMode]);

  useEffect(() => {
    const abortController = new AbortController();
    fetchSummary(abortController.signal);
    return () => abortController.abort();
  }, [fetchSummary]);

  const handleDateChange = (direction) => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      if (viewMode === 'monthly') {
        newDate.setDate(1);
        newDate.setMonth(newDate.getMonth() + direction);
      } else {
        newDate.setDate(newDate.getDate() + direction);
      }
      return newDate;
    });
  };

  const handleCardClick = async (type, title) => {
    if (type === 'total') {
      if (title.includes('Gider')) {
        setModalChartType('expense');
      } else if (title.includes('Gelir')) {
        setModalChartType('income');
      }
      setIsModalVisible(true);
      return;
    }

    setIsModalLoading(true);

    let currentColumns;

    if (type === 'paid' || type === 'expense_remaining') {
      let dynamicExpenseColumns = [...expenseTableColumns];
      const amountColumnIndex = dynamicExpenseColumns.findIndex(col => col.key === 'amount');
      if (amountColumnIndex !== -1) {
        if (type === 'paid') {
          dynamicExpenseColumns[amountColumnIndex] = { ...dynamicExpenseColumns[amountColumnIndex], title: 'Ödenen Tutar' };
          currentColumns = dynamicExpenseColumns.filter(col => col.key !== 'status');
        } else if (type === 'expense_remaining') {
          dynamicExpenseColumns[amountColumnIndex] = { ...dynamicExpenseColumns[amountColumnIndex], title: 'Kalan Tutar' };
          currentColumns = dynamicExpenseColumns;
        }
      } else {
        currentColumns = expenseTableColumns;
      }
    } else if (type === 'received' || type === 'income_remaining') {
      currentColumns = incomeTableColumns;
    } else {
      currentColumns = [];
    }

    setModalContent({ title: `${title} Listesi`, data: [], columns: currentColumns });

    try {
      let details = [];
      if (type === 'paid') {
        details = await getPaidExpenseDetails(currentDate, viewMode);
      } else if (type === 'expense_remaining') {
        details = await getRemainingExpenseDetails(currentDate, viewMode);
      } else if (type === 'received') {
        details = await getReceivedIncomeDetails(currentDate, viewMode);
      } else if (type === 'income_remaining') {
        details = await getRemainingIncomeDetails(currentDate, viewMode);
      }

      const formattedDetails = Array.isArray(details)
        ? details.map(item => ({
            key: item.id,
            id: item.id,
            description: item.description || 'Açıklama Yok',
            region: item.region?.name || '-',
            account_name: item.account_name?.name || '-',
            budget_item: item.budget_item?.name || '-',
            payment_type: item.payment_type?.name || '-',
            amount: item.payment_amount || item.remaining_amount || item.receipt_amount,
            date: new Date(item.date || item.payment_date || item.receipt_date).toLocaleDateString('tr-TR'),
            status: item.status,
            income_description: item.income?.description,
            company_name: item.income?.company?.name,
            notes: item.notes,
          }))
        : [];

      setModalContent(prev => ({ ...prev, data: formattedDetails }));
    } catch (apiError) {
      console.error("Detaylar alınırken hata:", apiError);
      setModalContent(prev => ({ ...prev, data: [] }));
    } finally {
      setIsModalLoading(false);
    }
  };

  const expenseTableColumns = [
    { title: 'Bölge', dataIndex: 'region', key: 'region' },
    { title: 'Hesap Adı', dataIndex: 'account_name', key: 'account_name' },
    { title: 'Bütçe Kalemi', dataIndex: 'budget_item', key: 'budget_item' },
    { title: 'Tutar', dataIndex: 'amount', key: 'amount', render: text => formatCurrency(text), align: 'right' },
    { title: 'Durum', dataIndex: 'status', key: 'status', render: getStatusTag, align: 'center' },
    { title: 'Açıklama', dataIndex: 'description', key: 'description' },
    { title: 'Tarih', dataIndex: 'date', key: 'date', align: 'center' },
  ];

  const incomeTableColumns = [
    { title: 'Şirket Adı', dataIndex: 'company_name', key: 'company_name' },
    { title: 'Bölge', dataIndex: 'region', key: 'region' },
    { title: 'Hesap Adı', dataIndex: 'account_name', key: 'account_name' },
    { title: 'Bütçe Kalemi', dataIndex: 'budget_item', key: 'budget_item' },
    { title: 'Alınan Tutar', dataIndex: 'amount', key: 'amount', render: text => formatCurrency(text), align: 'right' },
    { title: 'Başlık', dataIndex: 'income_description', key: 'income_description' },
    { title: 'Tarih', dataIndex: 'date', key: 'date', align: 'center' },
  ];

  if (error) return <Alert message={error} type="error" showIcon closable />;

  const {
    total_expenses = 0,
    total_payments = 0,
    total_expense_remaining = 0,
    total_income = 0,
    total_received = 0,
    total_income_remaining = 0,
  } = summary || {};

  const expensePaidPercentage = total_expenses > 0 ? (total_payments / total_expenses) * 100 : 0;
  const expenseRemainingPercentage = total_expenses > 0 ? (total_expense_remaining / total_expenses) * 100 : 0;
  const incomeReceivedPercentage = total_income > 0 ? (total_received / total_income) * 100 : 0;
  const incomeRemainingPercentage = total_income > 0 ? (total_income_remaining / total_income) * 100 : 0;

  const formatDisplayDate = (date) =>
    viewMode === 'monthly'
      ? new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(date)
      : new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);

  return (
    <>
      <div className="summary-controls-container">
        <div className="controls-header">
          <Title level={5} className="date-display">{formatDisplayDate(currentDate)}</Title>
          <Button icon={<FilterOutlined />} onClick={() => setIsControlsVisible(!isControlsVisible)}>Filtrele</Button>
        </div>
        {isControlsVisible && (
          <div className="controls-wrapper visible">
            <div className="controls-inner">
              <Radio.Group value={viewMode} onChange={(e) => setViewMode(e.target.value)} buttonStyle="solid">
                <Radio.Button value="daily">Günlük</Radio.Button>
                <Radio.Button value="monthly">Aylık</Radio.Button>
              </Radio.Group>
              <div className="date-navigator">
                <Button icon={<LeftOutlined />} onClick={() => handleDateChange(-1)} disabled={loading} />
                <Button icon={<RightOutlined />} onClick={() => handleDateChange(1)} disabled={loading} />
              </div>
            </div>
          </div>
        )}
      </div>

      <Spin spinning={loading}>
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <Card title="Gider Özeti" bordered={false}>
              <div className="summary-card-container">
                <CircularProgressCard title="Ödenen" percentage={expensePaidPercentage} amount={total_payments} color="success-color" onClick={() => handleCardClick('paid', 'Yapılan Ödemeler')} />
                <CircularProgressCard title="Ödenecek Kalan" percentage={expenseRemainingPercentage} amount={total_expense_remaining} color="error-color" onClick={() => handleCardClick('expense_remaining', 'Ödenecek Giderler')} />
                <CircularProgressCard title="Toplam Gider" percentage={100} amount={total_expenses} color="text-color-primary" onClick={() => handleCardClick('total', 'Toplam Gider')} />
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Gelir Özeti" bordered={false}>
              <div className="summary-card-container">
                <CircularProgressCard title="Alınan" percentage={incomeReceivedPercentage} amount={total_received} color="success-color" onClick={() => handleCardClick('received', 'Alınan Gelirler')} />
                <CircularProgressCard title="Alınacak Kalan" percentage={incomeRemainingPercentage} amount={total_income_remaining} color="warning-color" onClick={() => handleCardClick('income_remaining', 'Alınacak Gelirler')} />
                <CircularProgressCard title="Toplam Gelir" percentage={100} amount={total_income} color="success-color" onClick={() => handleCardClick('total', 'Toplam Gelir')} />
              </div>
            </Card>
          </Col>
        </Row>
      </Spin>

      <Modal
        title={modalChartType ? 'Gelir/Gider Grafiği' : modalContent.title}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setModalChartType(null);
        }}
        footer={null}
        width={1200}
        destroyOnClose
      >
        {modalChartType ? (
          modalChartType === 'income' ? (
            <IncomeChart
              dateRange={{
                start: currentDate.toISOString().slice(0, 10),
                end: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().slice(0, 10),
              }}
              viewMode={viewMode}
            />
          ) : (
            <ExpenseChart
              dateRange={{
                start: currentDate.toISOString().slice(0, 10),
                end: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().slice(0, 10),
              }}
              viewMode={viewMode}
            />
          )
        ) : isModalLoading ? (
          <Row justify="center" align="middle" style={{ padding: '50px' }}>
            <Spin size="large" />
          </Row>
        ) : (
          <Table
            columns={modalContent.columns}
            dataSource={modalContent.data}
            rowKey="id"
            pagination={{ pageSize: 8, size: 'small' }}
          />
        )}
      </Modal>
    </>
  );
}
