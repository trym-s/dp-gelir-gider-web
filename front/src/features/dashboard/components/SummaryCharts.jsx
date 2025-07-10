import React, { useState, useEffect } from 'react';
import { Card, Spin, Alert, Row, Modal, Table, Tag } from "antd";
import { getDashboardSummary, getExpenseDetailsForThisMonth, getIncomeDetails } from '../../../api/dashboardService';
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
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));

  // Modal state'leri
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', data: [], columns: [] });
  const [isModalLoading, setIsModalLoading] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const data = await getDashboardSummary(currentMonth);
        setSummary(data);
      } catch (err) {
        const errorMessage = err.response ? JSON.stringify(err.response.data) : err.message;
        setError(`Summary data could not be loaded: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [currentMonth]);

  const handleCardClick = async (type, title) => {
    if (type === 'total') return;

    setIsModalVisible(true);
    setIsModalLoading(true);
    
    let currentColumns;
    if (type === 'paid' || type === 'expense_remaining') {
      currentColumns = expenseTableColumns;
      if (type === 'paid') {
        currentColumns = expenseTableColumns.filter(col => col.key !== 'status');
      }
    } else if (type === 'received') {
      currentColumns = incomeTableColumns;
    } else {
      currentColumns = []; // Diğer durumlar için varsayılan
    }

    setModalContent({ title: `${title} Listesi`, data: [], columns: currentColumns });

    try {
        let details = [];
        if (type === 'paid') {
            details = await getExpenseDetailsForThisMonth('paid', currentMonth);
        } else if (type === 'expense_remaining') {
            details = await getExpenseDetailsForThisMonth('expense_remaining', currentMonth);
        } else if (type === 'received') {
            details = await getIncomeDetails('received', currentMonth);
        } else if (type === 'income_remaining') {
            // TODO: Kalan gelirler için servis çağrısı
        }

        let formattedDetails = [];
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
                status: item.status === 'UNPAID' ? 'Ödenmedi' : 'Kısmen Ödendi'
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
        
        setModalContent(prev => ({ ...prev, data: formattedDetails }));
    } catch (apiError) {
        console.error("Detaylar alınırken hata:", apiError);
        setModalContent(prev => ({ ...prev, data: [], columns: expenseTableColumns }));
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

  const expensePaidPercentage = total_expenses > 0 ? (total_payments / total_expenses) * 100 : 0;
  const expenseRemainingPercentage = total_expenses > 0 ? (total_expense_remaining / total_expenses) * 100 : 0;
  const incomeReceivedPercentage = total_income > 0 ? (total_received / total_income) * 100 : 0;
  const incomeRemainingPercentage = total_income > 0 ? (total_income_remaining / total_income) * 100 : 0;
  
  return (
    <>
      <Card title="Bu Ayın Giderleri" bordered={false} style={{ marginBottom: '24px' }}>
        <div className="summary-card-container">
          <CircularProgressCard title="Ödenen" percentage={expensePaidPercentage} text={`${Math.round(expensePaidPercentage)}%`} amount={total_payments} color="#4caf50" onClick={() => handleCardClick('paid', 'Yapılan Ödemeler')} />
          <CircularProgressCard title="Ödenecek Kalan" percentage={expenseRemainingPercentage} text={`${Math.round(expenseRemainingPercentage)}%`} amount={total_expense_remaining} color="#f44336" onClick={() => handleCardClick('expense_remaining', 'Ödenecek Giderler')} />
          <CircularProgressCard title="Toplam Gider" percentage={100} text="Tümü" amount={total_expenses} color="#2196f3" onClick={() => handleCardClick('total', '')} />
        </div>
      </Card>

      <Card title="Bu Ayın Gelirleri" bordered={false}>
          <div className="summary-card-container">
              <CircularProgressCard title="Alınan" percentage={incomeReceivedPercentage} text={`${Math.round(incomeReceivedPercentage)}%`} amount={total_received} color="#00acc1" onClick={() => handleCardClick('received', 'Alınan Gelirler')} />
              <CircularProgressCard title="Alınacak Kalan" percentage={incomeRemainingPercentage} text={`${Math.round(incomeRemainingPercentage)}%`} amount={total_income_remaining} color="#ff9800" onClick={() => handleCardClick('income_remaining', 'Alınacak Gelirler')} />
              <CircularProgressCard title="Toplam Gelir" percentage={100} text="Tümü" amount={total_income} color="#673ab7" onClick={() => handleCardClick('total', '')} />
          </div>
      </Card>

      <Modal title={modalContent.title} open={isModalVisible} onCancel={() => setIsModalVisible(false)} footer={null} width={1200} destroyOnClose>
        {isModalLoading ? (
          <Row justify="center" align="middle" style={{ padding: '50px' }}><Spin size="large" /></Row>
        ) : (
          <Table 
            columns={modalContent.columns} 
            dataSource={modalContent.data} 
            rowKey="id" 
            pagination={{ pageSize: 8, size: 'small' }}
            className="details-modal-table" // CSS için özel sınıf
          />
        )}
      </Modal>
    </>
  );
}
