import React, { useState, useEffect } from 'react';
import { Card, List, Typography, Spin, Alert, Tag, Button } from "antd"; 
import { ArrowUpOutlined, ArrowDownOutlined, ClockCircleOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { api } from "../../../api/api";
import styles from "../styles/ActivityLog.module.css";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/tr';
import AllTransactionsModal from './AllTransactionsModal';

dayjs.extend(relativeTime);
dayjs.locale('tr');

const { Text, Title } = Typography;

const getTransactionDetails = (type) => {
    if (type === 'GİDER') return { icon: <ArrowDownOutlined />, color: 'error' };
    if (type === 'GELİR') return { icon: <ArrowUpOutlined />, color: 'success' };
    return { icon: <ClockCircleOutlined />, color: 'default' };
};

// DEĞİŞİKLİK: Bileşen artık kendi state'ini tutmuyor, props alıyor.
export default function RecentTransactions({ isModalVisible, onOpenModal, onCloseModal }) {
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
    if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin /></div>;
    if (error) return <Alert message="Hata" description={error} type="error" showIcon />;
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
    <>
      <Card bordered={false} className={styles.sonIslemlerCard} style={{ marginBottom: '24px' }}>
        <div className={styles.baslik}>
          <Title level={5} className={styles.baslikText}>
            <ClockCircleOutlined />
            Son İşlemler
          </Title>
          {/* DEĞİŞİKLİK: onClick artık parent'tan gelen fonksiyonu çağırıyor */}
          <Button type="text" onClick={onOpenModal} className={styles.tumunuGorBtn}>
            Tümünü Gör <ArrowRightOutlined />
          </Button>
        </div>
        {renderContent()}
      </Card>

      {/* DEĞİŞİKLİK: Modal'ın görünürlüğü parent'tan gelen prop ile kontrol ediliyor */}
      <AllTransactionsModal
        visible={isModalVisible}
        onClose={onCloseModal}
      />
    </>
  );
}