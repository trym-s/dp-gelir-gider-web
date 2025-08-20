import React, { useState, useEffect } from 'react';
import { Card, List, Typography, Spin, Alert, Tag, Button } from "antd"; 
import { ArrowUpOutlined, ArrowDownOutlined, ClockCircleOutlined, ArrowRightOutlined, HistoryOutlined, LoginOutlined } from "@ant-design/icons";
import { getDashboardFeed } from "../../../api/transactionService"; // YENİ ÖZEL SERVİS
import styles from "../styles/ActivityLog.module.css";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/tr';
import AllTransactionsModal from './AllTransactionsModal';

dayjs.extend(relativeTime);
dayjs.locale('tr');

const { Text, Title } = Typography;

//getEventDetails fonksiyonunu aşağıdaki güncel haliyle değiştirin.
const getEventDetails = (category) => {
    if (category?.includes('Gelir')) return { icon: <ArrowUpOutlined />, color: 'success' };
    if (category?.includes('Gider') || category?.includes('Harcama')) return { icon: <ArrowDownOutlined />, color: 'error' };
    if (category?.includes('Kredi')) return { icon: <HistoryOutlined />, color: 'processing' };
    // --- YENİ EKLENEN KISIM ---
    if (category?.includes('Bakiye') || category?.includes('Limit')) return { icon: <LoginOutlined />, color: 'warning' };
    // -------------------------
    return { icon: <ClockCircleOutlined />, color: 'default' };
};

export default function RecentTransactions({ isModalVisible, onOpenModal, onCloseModal }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const response = await getDashboardFeed();
        setActivities(response.data || []);
      } catch (err) {
        setError("Son işlemler yüklenemedi.");
        console.error("RecentTransactions Hatası:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, []);

  const renderContent = () => {
    if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin /></div>;
    if (error) return <Alert message="Hata" description={error} type="error" showIcon />;
    return (
      <List
        className={styles.islemListesi}
        dataSource={activities}
        renderItem={(item) => {
          const { icon, color } = getEventDetails(item.category); // DEĞİŞTİ: item.event_type -> item.category
          const amount = item.amount ? parseFloat(item.amount) : null;
          // AÇIKLAMA OLARAK BANKA/ŞİRKET ADINI KULLANIYORUZ
          const descriptionText = item.bank_or_company || item.description || 'Detay Yok';

          return (
            <List.Item className={styles.islem}>
              <Tag color={color} className={styles.islemIkon}>{icon}</Tag>
              <div className={styles.islemDetay}>
                <Text className={styles.islemText}>{descriptionText}</Text>
                <Text type="secondary" className={styles.islemZaman}>
                  {dayjs(item.event_date).fromNow()}
                  {amount !== null && ` - ${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`}
                </Text>
              </div>
            </List.Item>
          );
        }}
      />
    );
  };

  return (
    <>
      <Card bordered={false} className={styles.sonIslemlerCard} style={{ marginBottom: '24px' }}>
        <div className={styles.baslik}>
          <Title level={5} className={styles.baslikText}><ClockCircleOutlined />Son İşlemler</Title>
          <Button type="text" onClick={onOpenModal} className={styles.tumunuGorBtn}>
            Tümünü Gör <ArrowRightOutlined />
          </Button>
        </div>
        {renderContent()}
      </Card>
      <AllTransactionsModal visible={isModalVisible} onClose={onCloseModal} />
    </>
  );
}