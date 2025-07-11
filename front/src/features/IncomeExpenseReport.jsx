import { Card, DatePicker, Typography, Row, Col } from 'antd';
import { PieChart, Pie, Cell, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { useState } from 'react';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const gelirData = [
  { name: 'Kategorisiz', value: 2000 },
];

const giderData = [
  { name: 'Kategorisiz', value: 5000 },
];

const COLORS = ['#00BCD4', '#FF9800', '#8BC34A', '#F44336'];

const lineData = [
  { tarih: '7 Tem', tahsilat: 2000, odeme: 5000 },
  { tarih: '14 Tem', tahsilat: 0, odeme: 0 },
  { tarih: '21 Tem', tahsilat: 0, odeme: 0 },
  { tarih: '28 Tem', tahsilat: 0, odeme: 0 },
  { tarih: '4 Ağu', tahsilat: 0, odeme: 0 },
  { tarih: '11 Ağu', tahsilat: 0, odeme: 0 },
  { tarih: '18 Ağu', tahsilat: 0, odeme: 0 },
];

export default function GelirGiderRaporu() {
  const [tarihAraligi, setTarihAraligi] = useState([dayjs().startOf('month'), dayjs()]);

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>Gelir ve Gider Raporu</Title>

      {/* Tarih Filtresi */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col>
          <RangePicker
            value={tarihAraligi}
            onChange={(val) => setTarihAraligi(val)}
            format="DD MMMM YYYY"
          />
        </Col>
      </Row>

      {/* Gelir-Gider Pasta Grafik */}
      <Row gutter={24}>
        <Col span={12}>
          <Card title="Gelirlerin Dağılımı">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={gelirData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {gelirData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="Giderlerin Dağılımı">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={giderData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {giderData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Net Bakiye Çizgi Grafik */}
      <Row style={{ marginTop: 32 }}>
        <Col span={24}>
          <Card title="Tahmini Dönem Sonu Bakiyesi (12 Haftalık)">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tarih" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="tahsilat" stroke="#00BCD4" name="Tahsilat" />
                <Line type="monotone" dataKey="odeme" stroke="#FF9800" name="Ödeme" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
