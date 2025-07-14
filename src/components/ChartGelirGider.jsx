import { Card, Statistic, Row, Col } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";

export default function ChartGelirGider() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card title="Tahsilatlar" bordered={false}>
        <Row gutter={16}>
          <Col span={8}>
            <Card>
              <Statistic
                title="Toplam Tahsil Edilecek"
                value={19658.83}
                precision={2}
                suffix="₺"
              />
              <div style={{ color: "#888", marginTop: 8 }}>
                Tahsilat Yok <CheckCircleOutlined style={{ color: "#52c41a" }} />
              </div>
            </Card>
          </Col>

          <Col span={8}>
            <Card>
              <Statistic title="Gecikmiş" value={0} suffix="₺" />
              <div style={{ color: "#888", marginTop: 8 }}>
                Tahsilat Yok <CheckCircleOutlined style={{ color: "#52c41a" }} />
              </div>
            </Card>
          </Col>

          <Col span={8}>
            <Card>
              <Statistic title="Planlanmamış" value={0} suffix="₺" />
              <div style={{ color: "#888", marginTop: 8 }}>
                Fatura Yok <CheckCircleOutlined style={{ color: "#52c41a" }} />
              </div>
            </Card>
          </Col>
        </Row>
      </Card>

      <Card title="Ödemeler" bordered={false}>
        <Row gutter={16}>
          <Col span={8}>
            <Card>
              <Statistic
                title="Toplam Ödenecek"
                value={14405.25}
                precision={2}
                suffix="₺"
              />
              <div style={{ color: "#888", marginTop: 8 }}>
                Ödeme Yok <CheckCircleOutlined style={{ color: "#52c41a" }} />
              </div>
            </Card>
          </Col>

          <Col span={8}>
            <Card>
              <Statistic title="Gecikmiş" value={0} suffix="₺" />
              <div style={{ color: "#888", marginTop: 8 }}>
                Ödeme Yok <CheckCircleOutlined style={{ color: "#52c41a" }} />
              </div>
            </Card>
          </Col>

          <Col span={8}>
            <Card>
              <Statistic title="Planlanmamış" value={0} suffix="₺" />
              <div style={{ color: "#888", marginTop: 8 }}>
                Fatura Yok <CheckCircleOutlined style={{ color: "#52c41a" }} />
              </div>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
}
