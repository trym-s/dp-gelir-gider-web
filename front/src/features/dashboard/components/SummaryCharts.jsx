import React, { useState, useEffect } from 'react';
import { Card, Spin, Alert, Row } from "antd";
import { getDashboardSummary } from '../../../api/dashboardService';
import CircularProgressCard from './CircularProgressCard'; // Modüler kart bileşenimiz
import './SummaryCharts.css'; // Stillerin paylaşıldığı CSS dosyası
export default function ChartGelirGider() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const data = await getDashboardSummary();
        setSummary(data);
      } catch (err) {
        // Detaylı hata mesajı için
        const errorMessage = err.response ? JSON.stringify(err.response.data) : err.message;
        setError(`Özet verileri yüklenemedi. API bağlantısını veya dönen veriyi kontrol edin: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  if (loading) {
    return (
      <Row justify="center" align="middle" style={{ minHeight: '200px' }}>
        <Spin size="large" />
      </Row>
    );
  }

  if (error) {
    return <Alert message={error} type="error" showIcon closable />;
  }

  // API'dan gelen tüm verileri alıyoruz (gider ve gelir)
  const {
    total_expenses = 0,
    total_payments = 0,
    total_expense_remaining = 0, // Giderden kalan
    total_income = 0,
    total_received = 0,
    total_income_remaining = 0, // Gelirden kalan
  } = summary || {};

  // Gider yüzdeleri
  const expensePaidPercentage = total_expenses > 0 ? (total_payments / total_expenses) * 100 : 0;
  const expenseRemainingPercentage = total_expenses > 0 ? (total_expense_remaining / total_expenses) * 100 : 0;

  // Gelir yüzdeleri
  const incomeReceivedPercentage = total_income > 0 ? (total_received / total_income) * 100 : 0;
  const incomeRemainingPercentage = total_income > 0 ? (total_income_remaining / total_income) * 100 : 0;
  
  return (
    // İki kartı sarmak için React Fragment kullanıyoruz
    <>
      {/* GİDER ÖZET KARTI */}
      <Card title="Bu Ayın Gider Özeti" bordered={false} style={{ marginBottom: '24px' }}>
        <div className="summary-card-container">
          <CircularProgressCard
            title="Ödenen"
            percentage={expensePaidPercentage}
            text={`${Math.round(expensePaidPercentage)}%`}
            amount={total_payments}
            color="#4caf50" // Yeşil
          />
          <CircularProgressCard
            title="Ödenecek Kalan"
            percentage={expenseRemainingPercentage}
            text={`${Math.round(expenseRemainingPercentage)}%`}
            amount={total_expense_remaining}
            color="#f44336" // Kırmızı
          />
          <CircularProgressCard
            title="Toplam Gider"
            percentage={100}
            text="Tümü"
            amount={total_expenses}
            color="#2196f3" // Mavi
          />
        </div>
      </Card>

      {/* GELİR ÖZET KARTI */}
      <Card title="Bu Ayın Gelir Özeti" bordered={false}>
        <div className="summary-card-container">
          <CircularProgressCard
            title="Alınan"
            percentage={incomeReceivedPercentage}
            text={`${Math.round(incomeReceivedPercentage)}%`}
            amount={total_received}
            color="#00acc1" // Turkuaz
          />
          <CircularProgressCard
            title="Alınacak Kalan"
            percentage={incomeRemainingPercentage}
            text={`${Math.round(incomeRemainingPercentage)}%`}
            amount={total_income_remaining}
            color="#ff9800" // Turuncu
          />
          <CircularProgressCard
            title="Toplam Gelir"
            percentage={100}
            text="Tümü"
            amount={total_income}
            color="#673ab7" // Mor
          />
        </div>
      </Card>
    </>
  );
}