import React, { useState, useEffect } from 'react';
import { Button, DatePicker, Radio, Table, Typography, Spin } from 'antd';
import dayjs from 'dayjs';

// Yeni bileşenleri import ediyoruz
import CreditCard from './CreditCard'; // CreditCardDefinitions yerine
import CreditCardDailyEntryModal from './CreditCardDailyEntryModal';

// Paylaşılan stil dosyasını ve yeni CSS dosyasını kullanıyoruz
import '../shared/SharedPageStyles.css';
import './CreditCard.css'; // Yeni kartın CSS'i
import './CreditCardPage.css';

const { Text } = Typography;

// Mock Data güncellendi (expire_date eklendi)
const mockCreditCards = [
  { id: 1, bank_name: 'TFKP', limit: '0', card_name: 'Kart1', card_number: '4543454455556666', status: 'Aktif', expire_date: '12/28' },
  { id: 2, bank_name: 'QNB(MC)', limit: '750000.00', card_name: 'Kart1', card_number: '1234567890123456', status: 'Aktif', expire_date: '10/27' },
  { id: 3, bank_name: 'ZİRAAT(ANAKART)', limit: '100000.00', card_name: 'Kart1', card_number: '9876543210987654', status: 'Aktif', expire_date: '08/26' },
  { id: 4, bank_name: 'YAPI KREDİ', limit: '250000.00', card_name: 'Kart1', card_number: '1111222233334444', status: 'Pasif', expire_date: '05/25' },
];

const mockPivotData = [
    { key: 1, banka: 'TFKP', kart_adi: 'Kart1', kart_no: '...6666', '01.07.2025_sabah': 150000, '02.07.2025_sabah': 145000 },
    { key: 2, banka: 'QNB(MC)', kart_adi: 'Kart1', kart_no: '...3456', '01.07.2025_sabah': 750000, '02.07.2025_sabah': 740000 },
];

const generateDaysOfMonth = (monthDate) => {
    const start = dayjs(monthDate).startOf('month');
    const end = dayjs(monthDate).endOf('month');
    const d = [];
    for (let i = 1; i <= end.date(); i++) {
      d.push(dayjs(start).date(i).format('DD.MM.YYYY'));
    }
    return d;
};

const formatCurrency = (value) => {
    if (value == null) return '-';
    return parseFloat(value).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
};

const CreditCardsPage = () => {
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [days, setDays] = useState(generateDaysOfMonth(selectedMonth));
  const [displayMode, setDisplayMode] = useState('sabah');
  const [isEntryModalVisible, setEntryModalVisible] = useState(false);
  const [loading, setLoading] = useState(false); // Yüklenme durumu için

  const columns = [
    { title: 'Banka Adı', dataIndex: 'banka', key: 'banka', fixed: 'left', width: 150 },
    { title: 'Kredi Kartı Adı', dataIndex: 'kart_adi', key: 'kart_adi', fixed: 'left', width: 150 },
    { title: 'Kredi Kartı No', dataIndex: 'kart_no', key: 'kart_no', fixed: 'left', width: 180 },
    ...days.map(day => ({
      title: day,
      dataIndex: `${day}_${displayMode}`,
      key: `${day}_${displayMode}`,
      width: 120,
      render: formatCurrency,
    })),
  ];

  return (
    <div className="page-container">
      <h2>Kredi Kartı Durum Takibi</h2>
      
      {/* Üstteki tablo yerine card-list yapısını kullanıyoruz */}
      <Spin spinning={loading}>
        <div className="card-list">
          {mockCreditCards.map(card => (
            <CreditCard key={card.id} card={card} />
          ))}
        </div>
      </Spin>

      <div className="pivot-toolbar">
        <DatePicker picker="month" value={selectedMonth} onChange={setSelectedMonth} format="MMMM YYYY" />
        <Radio.Group value={displayMode} onChange={(e) => setDisplayMode(e.target.value)}>
          <Radio.Button value="sabah">Sabah</Radio.Button>
          <Radio.Button value="aksam">Akşam</Radio.Button>
        </Radio.Group>
        <div className="toolbar-spacer" />
        <Button type="primary" onClick={() => setEntryModalVisible(true)}>Günlük Giriş Ekle</Button>
      </div>

      <div className="pivot-table-wrapper">
        <Table
          columns={columns}
          dataSource={mockPivotData}
          scroll={{ x: 'max-content' }}
          pagination={false}
          bordered
          summary={pageData => {
            if (pageData.length === 0) return null;
            const totals = {};
            columns.forEach(col => {
                if (col.dataIndex) {
                    totals[col.dataIndex] = pageData.reduce((sum, record) => sum + parseFloat(record[col.dataIndex] || 0), 0);
                }
            });
            return (
              <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}>
                <Table.Summary.Cell index={0} colSpan={3}>Toplam</Table.Summary.Cell>
                {days.map((day, index) => (
                  <Table.Summary.Cell key={index} index={3 + index}>
                    {formatCurrency(totals[`${day}_${displayMode}`])}
                  </Table.Summary.Cell>
                ))}
              </Table.Summary.Row>
            );
          }}
        />
      </div>

      <CreditCardDailyEntryModal 
        visible={isEntryModalVisible} 
        onCancel={() => setEntryModalVisible(false)} 
        onSave={(values) => console.log("Kaydedilecek Veri:", values)} 
        allCreditCards={mockCreditCards} 
        selectedMonth={selectedMonth} 
      />
    </div>
  );
};

export default CreditCardsPage;
