import React, { useState, useEffect, useCallback } from 'react';
import { Card, Spin, Alert, Row, Modal, Table, Tag, Button, Radio } from "antd";
import { LeftOutlined, RightOutlined, UpOutlined, DownOutlined } from '@ant-design/icons';
import { 
  getDashboardSummary, 
  getPaidExpenseDetails, 
  getRemainingExpenseDetails, 
  getReceivedIncomeDetails,
  getRemainingIncomeDetails
} from '../../../api/dashboardService';
import CircularProgressCard from './CircularProgressCard';
import './SummaryCharts.css';

// Para birimi formatlama fonksiyonu
const formatCurrency = (value) => {
    if (value == null) return "0,00 ₺";
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
};

// Durum metnine göre renkli etiket döndüren fonksiyon
const getStatusTag = (status) => {
  const statusMap = {
    'PAID': { color: 'green', text: 'Ödendi' },
    'UNPAID': { color: 'red', text: 'Ödenmedi' },
    'PARTIALLY_PAID': { color: 'orange', text: 'Kısmi Ödendi' },
    'OVERPAID': {color:'purple',text:'Fazla Ödendi'},
    'DEFAULT': {color:'grey',text:'-'},
  };
  const { color, text } = statusMap[status] || { color: 'default', text: status };
  return <Tag color={color}>{text}</Tag>;
};

export default function SummaryCharts() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('monthly'); // 'daily' or 'monthly'
  const [isControlsVisible, setIsControlsVisible] = useState(true);

  // Modal state'leri
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', data: [], columns: [] });
  const [isModalLoading, setIsModalLoading] = useState(false);

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
        newDate.setDate(1); // Ayın başına git
        newDate.setMonth(newDate.getMonth() + direction);
      } else { // daily
        newDate.setDate(newDate.getDate() + direction);
      }
      return newDate;
    });
  };

  const handlePrev = () => handleDateChange(-1);
  const handleNext = () => handleDateChange(1);

  const formatDisplayDate = (date) => {
    if (viewMode === 'monthly') {
      return new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(date);
    }
    return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
  };

  const handleCardClick = async (type, title) => {
    if (type === 'total') return;
  
    setIsModalVisible(true);
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
  
        let formattedDetails = [];
        if (Array.isArray(details)) {
            if (type === 'paid') {
                formattedDetails = details.map(item => ({
                    key: item.id,
                    id: item.id,
                    description: item.expense?.description || 'Genel Ödeme',
                    region: item.expense?.region?.name || '-',
                    account_name: item.expense?.account_name?.name || '-',
                    budget_item: item.expense?.budget_item?.name || '-',
                    payment_type: item.expense?.payment_type?.name || '-',
                    amount: item.payment_amount,
                    date: new Date(item.payment_date).toLocaleDateString('tr-TR'),
                }));
            } else if (type === 'expense_remaining') {
                formattedDetails = details.map(item => ({
                    key: item.id,
                    id: item.id,
                    description: item.description || 'Açıklama Yok',
                    region: item.region?.name || '-',
                    account_name: item.account_name?.name || '-',
                    budget_item: item.budget_item?.name || '-',
                    payment_type: item.payment_type?.name || '-',
                    amount: item.remaining_amount,
                    date: new Date(item.date).toLocaleDateString('tr-TR'),
                    status: item.status
                }));
            } else if (type === 'received') {
                formattedDetails = details.map(item => ({
                  key: item.id,
                  id: item.id,
                  company_name: item.income?.company?.name || '-',
                  region: item.income?.region?.name || '-',
                  account_name: item.income?.account_name?.name || '-',
                  budget_item: item.income?.budget_item?.name || '-',
                  income_description: item.income?.description || 'Gelir Açıklaması Yok',
                  amount: item.receipt_amount,
                  date: new Date(item.receipt_date).toLocaleDateString('tr-TR'),
                  notes: item.notes,
                }));
            }
        }
        
        setModalContent(prev => ({ ...prev, data: formattedDetails }));
    } catch (apiError) {
        console.error("Detaylar alınırken hata:", apiError);
        setModalContent(prev => ({ ...prev, data: [] }));
    } finally {
        setIsModalLoading(false);
    }
  };

  // Giderler için Tablo Sütunları
  const expenseTableColumns = [
    { title: 'Bölge', dataIndex: 'region', key: 'region', width: 150 },
    { title: 'Hesap Adı', dataIndex: 'account_name', key: 'account_name', width: 180, ellipsis: true },
    { title: 'Bütçe Kalemi', dataIndex: 'budget_item', key: 'budget_item', width: 180, ellipsis: true },
    { 
      title: 'Tutar', 
      dataIndex: 'amount', 
      key: 'amount', 
      render: (text) => formatCurrency(text),
      align: 'right',
      width: 140
    },
    { 
      title: 'Durum', 
      dataIndex: 'status', 
      key: 'status', 
      render: getStatusTag,
      align: 'center',
      width: 130 
    },
    { title: 'Açıklama', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: 'Tarih', dataIndex: 'date', key: 'date', width: 120, align: 'center' },
  ];

  // Alınan Gelirler için Tablo Sütunları
  const incomeTableColumns = [
    { title: 'Şirket Adı', dataIndex: 'company_name', key: 'company_name', width: 180, ellipsis: true },
    { title: 'Bölge', dataIndex: 'region', key: 'region', width: 140 },
    { title: 'Hesap Adı', dataIndex: 'account_name', key: 'account_name', width: 160, ellipsis: true },
    { title: 'Bütçe Kalemi', dataIndex: 'budget_item', key: 'budget_item', width: 160, ellipsis: true },
    { 
      title: 'Alınan Tutar', 
      dataIndex: 'amount', 
      key: 'amount', 
      render: (text) => formatCurrency(text),
      align: 'right',
      width: 150
    },
    { title: 'Baslik', dataIndex: 'income_description', key: 'income_description', ellipsis: true },
    { title: 'Tahsilat Tarihi', dataIndex: 'date', key: 'date', width: 130, align: 'center' },
  ];

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

  const expensePaidPercentage = total_expenses > 0 ? (total_payments / total_expenses) * 100 : 0;
  const expenseRemainingPercentage = total_expenses > 0 ? (total_expense_remaining / total_expenses) * 100 : 0;
  const incomeReceivedPercentage = total_income > 0 ? (total_received / total_income) * 100 : 0;
  const incomeRemainingPercentage = total_income > 0 ? (total_income_remaining / total_income) * 100 : 0;

  return (
    <>
      <div className="summary-controls">
        <div className="controls-header">
          <Button 
            className="collapse-button"
            type="text"
            icon={isControlsVisible ? <UpOutlined /> : <DownOutlined />} 
            onClick={() => setIsControlsVisible(!isControlsVisible)} 
          />
        </div>
        <div className={`controls-wrapper ${isControlsVisible ? '' : 'collapsed'}`}>
          <Radio.Group value={viewMode} onChange={(e) => setViewMode(e.target.value)} buttonStyle="solid">
            <Radio.Button value="daily">Günlük</Radio.Button>
            <Radio.Button value="monthly">Aylık</Radio.Button>
          </Radio.Group>
          <div className="date-navigator">
            <Button icon={<LeftOutlined />} onClick={handlePrev} disabled={loading} />
            <span className="date-display">{formatDisplayDate(currentDate)}</span>
            <Button icon={<RightOutlined />} onClick={handleNext} disabled={loading} />
          </div>
        </div>
      </div>

      <Spin spinning={loading}>
        <Row gutter={[24, 24]}>
          <Card title="Gider Özeti" bordered={false} className="summary-category-card">
            <div className="summary-card-container">
              <CircularProgressCard title="Ödenen" percentage={expensePaidPercentage} text={`${Math.round(expensePaidPercentage)}%`} amount={total_payments} color="#5e8b7e" onClick={() => handleCardClick('paid', 'Yapılan Ödemeler')} />
              <CircularProgressCard title="Ödenecek Kalan" percentage={expenseRemainingPercentage} text={`${Math.round(expenseRemainingPercentage)}%`} amount={total_expense_remaining} color="#e07a5f" onClick={() => handleCardClick('expense_remaining', 'Ödenecek Giderler')} />
              <CircularProgressCard title="Toplam Gider" percentage={100} text="Tümü" amount={total_expenses} color="#3d405b" onClick={() => handleCardClick('total', '')} />
            </div>
          </Card>

          <Card title="Gelir Özeti" bordered={false} className="summary-category-card">
            <div className="summary-card-container">
                <CircularProgressCard title="Alınan" percentage={incomeReceivedPercentage} text={`${Math.round(incomeReceivedPercentage)}%`} amount={total_received} color="#6d9b9a" onClick={() => handleCardClick('received', 'Alınan Gelirler')} />
                <CircularProgressCard title="Alınacak Kalan" percentage={incomeRemainingPercentage} text={`${Math.round(incomeRemainingPercentage)}%`} amount={total_income_remaining} color="#f2cc8f" onClick={() => handleCardClick('income_remaining', 'Alınacak Gelirler')} />
                <CircularProgressCard title="Toplam Gelir" percentage={100} text="Tümü" amount={total_income} color="#81b29a" onClick={() => handleCardClick('total', '')} />
            </div>
          </Card>
        </Row>
      </Spin>

      <Modal title={modalContent.title} open={isModalVisible} onCancel={() => setIsModalVisible(false)} footer={null} width={1200} destroyOnClose>
        {isModalLoading ? (
          <Row justify="center" align="middle" style={{ padding: '50px' }}><Spin size="large" /></Row>
        ) : (
          <Table 
            columns={modalContent.columns} 
            dataSource={modalContent.data} 
            rowKey="id" 
            pagination={{ pageSize: 8, size: 'small' }}
            className="details-modal-table"
          />
        )}
      </Modal>
    </>
  );
}
