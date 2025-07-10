import React, { useState, useEffect } from 'react';
import { Card, Statistic, Row, Col, Spin, Alert } from "antd";
import { getDashboardSummary } from '../../../api/dashboardService'; // 1. Yeni servisi import et

// Sayısal değerleri para formatında göstermek için yardımcı bir fonksiyon
const formatCurrency = (value) => {
  // Eğer değer null veya undefined ise 0 göster
  if (value == null) return "0,00 ₺";
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
};

export default function ChartGelirGider() {
  // 2. State'leri tanımla: veri, yüklenme durumu ve hata durumu
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 3. Component yüklendiğinde veriyi çekmek için useEffect kullan
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const data = await getDashboardSummary();
        setSummary(data);
      } catch (err) {
        setError("Özet verileri yüklenemedi. API bağlantısını kontrol edin.");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []); // Boş dependency array [] sayesinde bu sadece bir kere çalışır

  // 4. Yüklenme durumunu handle et
  if (loading) {
    return (
      <Card title="Özet Yükleniyor...">
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  // 5. Hata durumunu handle et
  if (error) {
    return <Alert message={error} type="error" showIcon />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card title="Bu Ayın Özeti - Giderler" bordered={false}>
        <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={8}>
            <Card>
              <Statistic
                title=" Ödenen"
                value={summary?.total_payments || 0}
                formatter={formatCurrency}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <Card>
              <Statistic
                title="Ödenecek Kalan"
                value={summary?.total_remaining_amount || 0}
                formatter={formatCurrency}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <Card>
              <Statistic
                title="Toplam Gider"
                value={summary?.total_expenses || 0}
                formatter={formatCurrency}
              />
            </Card>
          </Col>

        </Row>
      </Card>

      {/* İleride "Ödemeler" kartı için de benzer bir yapı kurabilirsiniz */}

    </div>
  );
}