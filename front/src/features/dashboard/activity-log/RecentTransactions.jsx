// front/src/features/dashboard/RecentTransactions.jsx

import React, { useState, useEffect } from 'react';
import { Card, List, Typography, Spin, Alert, Tag } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { api } from "../../../api/api"; // Go up one more level
import styles from "../styles/ActivityLog.module.css"; // Go up one level for styles
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/tr';

dayjs.extend(relativeTime);
dayjs.locale('tr');

const { Text, Title } = Typography;

// İşlem türüne göre ikon ve renk belirleyen fonksiyon
const getTransactionDetails = (type) => {
  if (type === 'GİDER') {
    return { icon: <ArrowDownOutlined />, color: 'error' };
  }
  if (type === 'GELİR') {
    return { icon: <ArrowUpOutlined />, color: 'success' };
  }
  return { icon: <ClockCircleOutlined />, color: 'default' };
};

export default function RecentTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const response = await api.get('/dashboard/recent-transactions');
        setTransactions(response.data);
      } catch (err) {
        setError("Son işlemler yüklenemedi.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const renderContent = () => {
    if (loading) {
      return <div style={{ textAlign: 'center', padding: '50px' }}><Spin /></div>;
    }
    if (error) {
      return <Alert message="Hata" description={error} type="error" showIcon />;
    }
    return (
      <List
        className={styles.islemListesi}
        dataSource={transactions}
        renderItem={(item) => {
          const { icon, color } = getTransactionDetails(item.type);
          return (
            <List.Item className={styles.islem}>
              <Tag color={color} className={styles.islemIkon}>{icon}</Tag>
              <div className={styles.islemDetay}>
                <Text className={styles.islemText}>{item.description}</Text>
                <Text type="secondary" className={styles.islemZaman}>
                  {dayjs(item.date).fromNow()} - {item.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                </Text>
              </div>
            </List.Item>
          );
        }}
      />
    );
  };

  return (
    <Card bordered={false} className={styles.sonIslemlerCard} style={{ marginBottom: '24px' }}>
      <div className={styles.baslik}>
        <Title level={5} className={styles.baslikText}>
          <ClockCircleOutlined />
          Son İşlemler
        </Title>
      </div>
      {renderContent()}
    </Card>
  );
}