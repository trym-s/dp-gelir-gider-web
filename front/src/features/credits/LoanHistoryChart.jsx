import React, { useState, useEffect } from 'react';
import { getLoanHistory } from '../../api/loanService'; // Servisi import edin
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Spin, Alert, Typography, Checkbox, Row, Col, Card } from 'antd';

const { Title } = Typography;

// Her bir kredi için rastgele bir renk üreten basit bir yardımcı fonksiyon
const colorPalette = ["#82ca9d", "#ffc658", "#ff7300", "#d0ed57", "#a4de6c", "#8884d8", "#FA8072", "#87CEEB"];
const getColor = (index) => colorPalette[index % colorPalette.length];

const LoanHistoryChart = () => {
  const [chartData, setChartData] = useState(null);
  const [visibleLoans, setVisibleLoans] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await getLoanHistory();
        setChartData(response.data);
        // Initially set all loans to be visible
        if (response.data && response.data.individual_loan_histories) {
          const initialVisibility = Object.keys(response.data.individual_loan_histories).reduce((acc, loanId) => {
            acc[loanId] = true;
            return acc;
          }, {});
          setVisibleLoans(initialVisibility);
        }
      } catch (err) {
        setError("Veri alınırken bir hata oluştu.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCheckboxChange = (loanId) => {
    setVisibleLoans(prev => ({
      ...prev,
      [loanId]: !prev[loanId]
    }));
  };

  if (loading) return <Spin tip="Grafik Yükleniyor..." style={{ display: 'block', marginTop: '20px' }} />;
  if (error) return <Alert message="Hata" description={error} type="error" showIcon />;
  if (!chartData || !chartData.total_balance_history || chartData.total_balance_history.length === 0) {
    return <Alert message="Bilgi" description="Gösterilecek kredi geçmişi verisi bulunamadı." type="info" showIcon />;
  }

  return (
    <Card>
        <Title level={4}>Kredi Bakiyesi Tarihçesi</Title>
        <div style={{ marginBottom: '20px' }}>
            <Row>
            {Object.keys(chartData.individual_loan_histories).map((loanId, index) => (
                <Col key={loanId} xs={24} sm={12} md={8} lg={6}>
                    <Checkbox
                        checked={!!visibleLoans[loanId]}
                        onChange={() => handleCheckboxChange(loanId)}
                    >
                        <span style={{ color: getColor(index), fontWeight: 'bold' }}>
                            {chartData.individual_loan_histories[loanId].name}
                        </span>
                    </Checkbox>
                </Col>
            ))}
            </Row>
        </div>
        <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer>
            <LineChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" data={chartData.total_balance_history} />
                <YAxis tickFormatter={(value) => new Intl.NumberFormat('tr-TR', { notation: 'compact', compactDisplay: 'short' }).format(value)} />
                <Tooltip formatter={(value) => `${value.toLocaleString('tr-TR')} ₺`} />
                <Legend />
                <Line
                    type="monotone"
                    data={chartData.total_balance_history}
                    dataKey="balance"
                    name="Toplam Anapara"
                    stroke="#1890ff"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 8 }}
                />
                {Object.keys(visibleLoans).map((loanId, index) =>
                    visibleLoans[loanId] && (
                    <Line
                        key={loanId}
                        type="monotone"
                        data={chartData.individual_loan_histories[loanId].history}
                        dataKey="balance"
                        name={chartData.individual_loan_histories[loanId].name}
                        stroke={getColor(index)}
                        strokeWidth={2}
                        dot={false}
                    />
                    )
                )}
            </LineChart>
            </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default LoanHistoryChart;
