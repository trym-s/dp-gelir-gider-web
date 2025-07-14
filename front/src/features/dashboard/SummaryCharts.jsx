import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Typography, Spin, Alert } from 'antd';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { getDashboardSummary } from '../../api/dashboardService';
import { useExpenseDetail } from '../../context/ExpenseDetailContext';
import { useIncomeDetail } from '../../context/IncomeDetailContext';
import TransactionListModal from './components/TransactionListModal';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const { Title: AntTitle } = Typography;

const chartOptions = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top',
    },
  },
};

const pieChartOptions = {
  responsive: true,
  plugins: {
    legend: {
      position: 'right',
    },
  },
};

const SummaryCharts = () => {
  const [expenseSummary, setExpenseSummary] = useState(null);
  const [incomeSummary, setIncomeSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [listModal, setListModal] = useState({ visible: false, title: '', items: [], type: '' });

  const { openExpenseModal } = useExpenseDetail();
  const { openIncomeModal } = useIncomeDetail();

  useEffect(() => {
    const fetchSummaries = async () => {
      try {
        setLoading(true);
        // TODO: Replace hardcoded date and viewMode with values from a context or state
        const summaryData = await getDashboardSummary(new Date(), 'monthly');
        setExpenseSummary(summaryData.expenses);
        setIncomeSummary(summaryData.incomes);
      } catch (err) {
        setError('Özet verileri yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };
    fetchSummaries();
  }, []);

  const handleElementClick = (elements, data, chartType, transactionType) => {
    if (elements.length === 0) return;
    const elementIndex = elements[0].index;
    const label = data.labels[elementIndex];
    
    const summary = transactionType === 'expense' ? expenseSummary : incomeSummary;
    let sourceData;

    if (chartType === 'region') {
      sourceData = summary.by_region.find(item => item.region_name === label)?.items || [];
    } else if (chartType === 'budgetItem') {
      sourceData = summary.by_budget_item.find(item => item.budget_item_name === label)?.items || [];
    } else if (chartType === 'status') {
      sourceData = summary.by_status[label.toLowerCase()]?.items || [];
    }

    if (sourceData && sourceData.length > 0) {
      if (sourceData.length === 1) {
        const itemId = sourceData[0].id;
        if (transactionType === 'expense') {
          openExpenseModal(itemId);
        } else {
          openIncomeModal(itemId);
        }
      } else {
        setListModal({
          visible: true,
          title: `${label} - ${transactionType === 'expense' ? 'Gider' : 'Gelir'} Listesi`,
          items: sourceData,
          type: transactionType,
        });
      }
    }
  };

  const handleListItemClick = (item) => {
    setListModal(prev => ({ ...prev, visible: false }));
    if (listModal.type === 'expense') {
      openExpenseModal(item.id);
    } else {
      openIncomeModal(item.id);
    }
  };

  const generateChartData = (summary, type) => {
    if (!summary) return { labels: [], datasets: [] };
    
    const statusChartData = {
      labels: Object.keys(summary.by_status).map(key => key.toUpperCase()),
      datasets: [{
        label: type === 'expense' ? 'Gider Sayısı' : 'Gelir Sayısı',
        data: Object.values(summary.by_status).map(val => val.count),
        backgroundColor: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0'],
      }],
    };

    const regionChartData = {
      labels: summary.by_region.map(item => item.region_name),
      datasets: [{
        label: 'Toplam Tutar (₺)',
        data: summary.by_region.map(item => item.total_amount),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      }],
    };

    const budgetItemChartData = {
      labels: summary.by_budget_item.map(item => item.budget_item_name),
      datasets: [{
        label: 'Toplam Tutar (₺)',
        data: summary.by_budget_item.map(item => item.total_amount),
        backgroundColor: summary.by_budget_item.map((_, i) => `hsl(${i * 40}, 70%, 60%)`),
      }],
    };
    
    return { statusChartData, regionChartData, budgetItemChartData };
  };

  const expenseCharts = generateChartData(expenseSummary, 'expense');
  const incomeCharts = generateChartData(incomeSummary, 'income');

  if (loading) return <Spin tip="Grafikler Yükleniyor..." size="large" />;
  if (error) return <Alert message={error} type="error" showIcon />;

  return (
    <>
      <Row gutter={[16, 32]}>
        {/* Expense Charts */}
        <Col span={24}><AntTitle level={3}>Gider Özetleri</AntTitle></Col>
        <Col xs={24} md={12} lg={8}>
          <Card title="Gider Durumlarına Göre Dağılım">
            <Pie 
              data={expenseCharts.statusChartData} 
              options={{ ...pieChartOptions, onClick: (e, el) => handleElementClick(el, expenseCharts.statusChartData, 'status', 'expense') }} 
            />
          </Card>
        </Col>
        <Col xs={24} md={12} lg={16}>
          <Card title="Bölgelere Göre Gider Toplamları">
            <Bar 
              data={expenseCharts.regionChartData} 
              options={{ ...chartOptions, onClick: (e, el) => handleElementClick(el, expenseCharts.regionChartData, 'region', 'expense') }} 
            />
          </Card>
        </Col>
        <Col xs={24}>
          <Card title="Bütçe Kalemlerine Göre Gider Toplamları">
            <Bar 
              data={expenseCharts.budgetItemChartData} 
              options={{ ...chartOptions, onClick: (e, el) => handleElementClick(el, expenseCharts.budgetItemChartData, 'budgetItem', 'expense') }} 
            />
          </Card>
        </Col>

        {/* Income Charts */}
        <Col span={24}><AntTitle level={3}>Gelir Özetleri</AntTitle></Col>
        <Col xs={24} md={12} lg={8}>
          <Card title="Gelir Durumlarına Göre Dağılım">
            <Pie 
              data={incomeCharts.statusChartData} 
              options={{ ...pieChartOptions, onClick: (e, el) => handleElementClick(el, incomeCharts.statusChartData, 'status', 'income') }} 
            />
          </Card>
        </Col>
        <Col xs={24} md={12} lg={16}>
          <Card title="Bölgelere Göre Gelir Toplamları">
            <Bar 
              data={incomeCharts.regionChartData} 
              options={{ ...chartOptions, onClick: (e, el) => handleElementClick(el, incomeCharts.regionChartData, 'region', 'income') }} 
            />
          </Card>
        </Col>
        <Col xs={24}>
          <Card title="Bütçe Kalemlerine Göre Gelir Toplamları">
            <Bar 
              data={incomeCharts.budgetItemChartData} 
              options={{ ...chartOptions, onClick: (e, el) => handleElementClick(el, incomeCharts.budgetItemChartData, 'budgetItem', 'income') }} 
            />
          </Card>
        </Col>
      </Row>

      <TransactionListModal
        visible={listModal.visible}
        title={listModal.title}
        items={listModal.items}
        type={listModal.type}
        onCancel={() => setListModal(prev => ({ ...prev, visible: false }))}
        onItemClick={handleListItemClick}
      />
    </>
  );
};

export default SummaryCharts;

