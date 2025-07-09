import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Card, Table, Spin, Alert } from 'antd';

// Tablo sütunlarını tanımlayalım
const columns = [
  {
    title: 'Açıklama',
    dataIndex: 'description',
    key: 'description',
  },
  {
    title: 'Tutar',
    dataIndex: 'amount',
    key: 'amount',
    align: 'right',
  },
  {
    title: 'Tarih',
    dataIndex: 'date',
    key: 'date',
    render: (text) => new Date(text).toLocaleDateString('tr-TR'), // Tarihi formatla
  },
  {
    title: 'Durum',
    dataIndex: 'status',
    key: 'status',
  },
];

export default function ExpensesList() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        setLoading(true);
        // Backend'deki /api/expenses endpoint'ine istek atıyoruz
        const response = await api.get('/expenses');

        // --- İSTEDİĞİNİZ ADIM: VERİYİ KONSOLA YAZDIRMA ---
        console.log('API\'dan gelen gider verisi:', response.data);

        // Gelen veriyi state'e kaydediyoruz
        setExpenses(response.data);
        setError(null);
      } catch (err) {
        console.error('Giderler alınırken hata oluştu:', err);
        setError('Gider verileri yüklenemedi. Backend sunucusunu kontrol edin.');
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, []); // Boş dependency array'i sayesinde bu sadece bileşen ilk yüklendiğinde çalışır

  // Yüklenme durumunu göster
  if (loading) {
    return (
      <Card title="Giderler Yükleniyor...">
        <Spin />
      </Card>
    );
  }

  // Hata durumunu göster
  if (error) {
    return <Alert message={error} type="error" showIcon />;
  }

  // Veri başarıyla geldiyse tabloyu göster
  return (
    <Card title="Gider Listesi">
      <Table
        dataSource={expenses}
        columns={columns}
        rowKey="id" // Her satır için benzersiz bir anahtar
        pagination={{ pageSize: 5 }} // Sayfalama ekleyelim
      />
    </Card>
  );
}