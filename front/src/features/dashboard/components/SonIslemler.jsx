import { Card, List, Typography } from "antd";
import { ClockCircleOutlined } from "@ant-design/icons";

const { Text } = Typography;

export default function SonIslemler() {
  const bugun = new Date().toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long"
  });

  const islemler = [
    "8.000₺ tahsilat yapıldı",
    "2.500₺ gider eklendi",
    "Yeni şirket eklendi"
  ];

  return (
    <Card bordered={false} style={{ height: "100%" }}>
      {/* Başlık */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        <Text strong style={{ fontSize: 16 }}>
          <ClockCircleOutlined style={{ marginRight: 6 }} />
          Bugün – {bugun}
        </Text>
      </div>

      {/* Liste */}
      <List
        dataSource={islemler}
        renderItem={(item) => (
          <List.Item style={{ padding: "4px 0", borderBottom: "none" }}>
            <span style={{ color: "#333" }}>• {item}</span>
          </List.Item>
        )}
      />

      {/* Geçmiş işlemler linki */}
      <div style={{ marginTop: 12 }}>
        <Text type="secondary" style={{ fontSize: 12, cursor: "pointer" }}>
          Geçmiş işlemleri göster
        </Text>
      </div>
    </Card>
  );
}
