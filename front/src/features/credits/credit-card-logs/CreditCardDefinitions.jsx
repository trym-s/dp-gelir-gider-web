import React from 'react';
import { Table, Tag, Typography } from 'antd';
import './CreditCardPage.css'; // Birazdan oluşturacağız

const { Text } = Typography;

// Kart tanımlamalarını gösteren üst tablo bileşeni
const CreditCardDefinitions = ({ cards, loading }) => {
  const columns = [
    {
      title: 'Banka',
      dataIndex: 'bank_name',
      key: 'bank_name',
    },
    {
      title: 'Limit',
      dataIndex: 'limit',
      key: 'limit',
      render: (limit) => parseFloat(limit).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })
    },
    {
      title: 'Kredi Kartı Adı',
      dataIndex: 'card_name',
      key: 'card_name',
    },
    {
      title: 'Kredi Kartı No (Unique)',
      dataIndex: 'card_number',
      key: 'card_number',
    },
    {
      title: 'Durum',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = status === 'Aktif' ? 'success' : 'error';
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      }
    }
  ];

  return (
    <div className="definitions-table-wrapper">
      <Table
        columns={columns}
        dataSource={cards}
        pagination={false}
        loading={loading}
        rowKey="id"
        title={() => <Text strong>Kredi Kartı Tanımlamaları</Text>}
      />
    </div>
  );
};

export default CreditCardDefinitions;
