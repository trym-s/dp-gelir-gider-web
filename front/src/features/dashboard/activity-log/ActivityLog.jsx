import React from 'react';
import { Card, List, Typography, Button, Tag } from "antd";
import {
  ClockCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  PlusOutlined,
  EyeOutlined
} from "@ant-design/icons";
import styles from '../styles/ActivityLog.module.css';

const { Text, Title } = Typography;

// İşlem türüne göre ikon ve renk döndüren yardımcı fonksiyon
const getIslemDetails = (type) => {
  switch (type) {
    case 'gelir':
      return { icon: <ArrowUpOutlined />, color: 'success' };
    case 'gider':
      return { icon: <ArrowDownOutlined />, color: 'error' };
    case 'sistem':
      return { icon: <PlusOutlined />, color: 'processing' };
    default:
      return { icon: <ClockCircleOutlined />, color: 'default' };
  }
};

export default function ActivityLog() {
  const bugun = new Date().toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long"
  });

  // Daha zengin ve çeşitli veri yapısı
  const islemler = [
    { type: 'gelir', text: '8.000₺ tahsilat yapıldı', time: '14:30' },
    { type: 'gider', text: '2.500₺ gider eklendi', time: '12:15' },
    { type: 'sistem', text: 'Yeni şirket eklendi', time: '09:45' },
    { type: 'gelir', text: '1.200₺ tahsilat yapıldı', time: '08:00' },
  ];

  return (
    <Card bordered={false} className={styles.sonIslemlerCard}>
      <div className={styles.baslik}>
        <Title level={5} className={styles.baslikText}>
          <ClockCircleOutlined />
          Aktivite Günlüğü
        </Title>
        <Text type="secondary">{bugun}</Text>
      </div>

      <List
        className={styles.islemListesi}
        dataSource={islemler}
        renderItem={(item) => {
          const { icon, color } = getIslemDetails(item.type);
          return (
            <List.Item className={styles.islem}>
              <Tag color={color} className={styles.islemIkon}>
                {icon}
              </Tag>
              <div className={styles.islemDetay}>
                <Text className={styles.islemText}>{item.text}</Text>
                <Text type="secondary" className={styles.islemZaman}>{item.time}</Text>
              </div>
            </List.Item>
          );
        }}
      />

      <div className={styles.footer}>
        <Button type="link" icon={<EyeOutlined />}>
          Tüm İşlemleri Gör
        </Button>
      </div>
    </Card>
  );
}
