import React, { useState, useEffect, useCallback } from 'react';
import { Button, DatePicker, Radio, Table, Typography, Spin, message, Modal, Form, InputNumber } from 'antd';
import dayjs from 'dayjs';
import CreditCard from './CreditCard';
import CreditCardDailyEntryModal from './CreditCardDailyEntryModal';
import { exportToExcel } from '../reports/exportService';
import { creditCardReportConfig } from '../reports/reportConfig';
import {
  getCreditCards,
  getDailyLimitsForMonth,
  saveDailyLimits
} from '../../api/creditCardService';

import '../shared/SharedPageStyles.css';
import './CreditCard.css';
import './CreditCardPage.css';

const { Text } = Typography;

// --- EditLimitModal (Pivottan düzenleme için) ---
const EditLimitModal = ({ visible, onCancel, onSave, cellData }) => {
  const [form] = Form.useForm();
  useEffect(() => {
    if (visible && cellData) {
      form.setFieldsValue({ value: cellData.value });
    }
  }, [visible, cellData, form]);

  const handleOk = () => {
    form.validateFields().then(values => {
      onSave(cellData.rowKey, cellData.dataIndex, values.value);
      onCancel();
    });
  };

  const getModalTitle = () => {
    if (!cellData) return `Kullanılabilir Limiti Düzenle`;
    const datePart = cellData.dataIndex.split('_')[0];
    return `${cellData.banka} - ${cellData.kart_adi} / ${datePart}`;
  };

  return (
    <Modal title={getModalTitle()} visible={visible} onCancel={onCancel} onOk={handleOk} okText="Kaydet" cancelText="İptal" destroyOnClose>
      <Form form={form} layout="vertical" initialValues={{ value: cellData?.value || 0 }}>
        <Form.Item name="value" label="Yeni Kullanılabilir Limit (₺)" rules={[{ required: true, message: `Lütfen bir tutar girin!` }]}>
          <InputNumber style={{ width: '100%' }} min={0} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/,*/g, '')} autoFocus />
        </Form.Item>
      </Form>
    </Modal>
  );
};

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
    if (value == null || isNaN(parseFloat(value))) return '-';
    return parseFloat(value).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
};

const CreditCardsPage = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [days, setDays] = useState(() => generateDaysOfMonth(selectedMonth));
  const [displayMode, setDisplayMode] = useState('sabah');
  const [isEntryModalVisible, setEntryModalVisible] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creditCards, setCreditCards] = useState([]);
  const [monthlyLimits, setMonthlyLimits] = useState([]);
  const [pivotData, setPivotData] = useState([]);
  
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [editingCellData, setEditingCellData] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const year = selectedMonth.year();
      const month = selectedMonth.month() + 1;
      const [fetchedCards, fetchedMonthlyLimits] = await Promise.all([
        getCreditCards(),
        getDailyLimitsForMonth(year, month)
      ]);
      setCreditCards(fetchedCards);
      setMonthlyLimits(fetchedMonthlyLimits);
    } catch (err) {
      const errorMessage = err.message || "Veriler yüklenirken bir hata oluştu.";
      setError(errorMessage);
      messageApi.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, messageApi]);

  useEffect(() => {
    if (creditCards.length === 0 && !loading) {
        setPivotData([]);
        return;
    }

    const pivotMap = new Map();
    creditCards.forEach(card => {
        const key = card.id;
        const availableLimit = displayMode === 'sabah' 
            ? card.current_morning_limit 
            : card.current_evening_limit;

        pivotMap.set(key, { 
            key: key, 
            banka: card.bank_name, 
            kart_adi: card.name,
            kart_no: card.card_number ? `${card.card_number.slice(0, 4)} **** **** ${card.card_number.slice(-4)}` : '',
            limit: card.credit_card_limit,
            kullanilabilir: availableLimit
        });
    });

    monthlyLimits.forEach(item => {
        const key = item.credit_card_id;
        if (pivotMap.has(key)) {
            const existingRow = pivotMap.get(key);
            const entryDateFormatted = dayjs(item.entry_date).format('DD.MM.YYYY');
            if (item.morning_limit != null) existingRow[`${entryDateFormatted}_sabah`] = item.morning_limit;
            if (item.evening_limit != null) existingRow[`${entryDateFormatted}_aksam`] = item.evening_limit;
        }
    });
    
    setPivotData(Array.from(pivotMap.values()));
  }, [creditCards, monthlyLimits, displayMode, loading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setDays(generateDaysOfMonth(selectedMonth));
  }, [selectedMonth]);
  
  const handleSaveEntries = async (entries) => {
    for (const entry of entries) {
        const card = creditCards.find(c => c.id === entry.credit_card_id);
        if (card) {
            const totalLimit = parseFloat(card.credit_card_limit);
            const morningLimit = parseFloat(entry.morning_limit);
            const eveningLimit = parseFloat(entry.evening_limit);

            // Hem sabah hem de akşam limiti için ayrı ayrı kontrol yap
            if (morningLimit > totalLimit) {
                messageApi.error(`${card.name} için girilen sabah limiti (${formatCurrency(morningLimit)}), toplam limitten (${formatCurrency(totalLimit)}) büyük olamaz.`);
                return; // İşlemi durdur
            }
            if (eveningLimit > totalLimit) {
                messageApi.error(`${card.name} için girilen akşam limiti (${formatCurrency(eveningLimit)}), toplam limitten (${formatCurrency(totalLimit)}) büyük olamaz.`);
                return; // İşlemi durdur
            }
        }
    }
    setLoading(true);
    try {
      const formattedEntries = entries.map(entry => ({
        ...entry,
        tarih: dayjs(entry.tarih, 'DD.MM.YYYY').format('YYYY-MM-DD'),
      }));
      await saveDailyLimits(formattedEntries);
      messageApi.success('Girişler başarıyla kaydedildi!');
      setEntryModalVisible(false);
      fetchData();
    } catch (err) {
      const errorMessage = err.message || "Girişler kaydedilirken bir hata oluştu.";
      messageApi.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = (record, dataIndex, value) => {
    if (!dataIndex || !dataIndex.includes('_')) return;
    const datePart = dataIndex.split('_')[0];
    const clickedDate = dayjs(datePart, 'DD.MM.YYYY');
    
    // --- YENİ EKLENEN KONTROL ---
    if (clickedDate.isAfter(dayjs(), 'day')) {
        messageApi.warning('Gelecek tarihler için bu ekrandan işlem yapılamaz.');
        return;
    }
    setEditingCellData({
        rowKey: record.key,
        dataIndex: dataIndex,
        value: value,
        banka: record.banka,
        kart_adi: record.kart_adi
    });
    setEditModalVisible(true);
  };

  const handleSaveEditedCell = (rowKey, dataIndex, newValue) => {
      const cardId = rowKey;
    const newAvailableLimit = parseFloat(newValue);

    // İlgili kredi kartını state'imizden bulalım
    const card = creditCards.find(c => c.id === cardId);

    if (card) {
        const totalLimit = parseFloat(card.credit_card_limit);
        // Yeni girilen kullanılabilir limit, toplam limitten büyük mü diye kontrol et
        if (newAvailableLimit > totalLimit) {
            messageApi.error(`Girilen değer (${formatCurrency(newAvailableLimit)}), kartın toplam limitinden (${formatCurrency(totalLimit)}) büyük olamaz.`);
            return; // İşlemi durdur
        }
    }
    const [date, time] = dataIndex.split('_');
    const payload = [{
        credit_card_id: rowKey,
        tarih: date,
        [time]: newValue
    }];
    handleSaveEntries(payload);
    setEditModalVisible(false);
  };
  const handleExport = () => {
        exportToExcel(creditCardReportConfig, creditCards, monthlyLimits, selectedMonth);
  };
  const columns = [
    { title: 'Banka Adı', dataIndex: 'banka', key: 'banka', width: 150 },
    { title: 'Kredi Kartı Adı', dataIndex: 'kart_adi', key: 'kart_adi', fixed: 'left', width: 150 },
    { title: 'Kredi Kartı No', dataIndex: 'kart_no', key: 'kart_no', width: 180 },
    { title: 'Toplam Limit', dataIndex: 'limit', key: 'limit', fixed: 'left', width: 130, render: formatCurrency },
    { title: 'Kullanılabilir Limit', dataIndex: 'kullanilabilir', key: 'kullanilabilir', width: 150, render: (value) => <Text type="success" strong>{formatCurrency(value)}</Text> },
    ...days.map(day => ({
            title: day,
            dataIndex: `${day}_${displayMode}`,
            key: `${day}_${displayMode}`,
            width: 110, // Genişlik biraz azaltıldı
            className: 'compact-pivot-cell', // CSS ile stil vermek için class eklendi
            render: (value, record) => (
                <div className="pivot-cell" onClick={() => handleCellClick(record, `${day}_${displayMode}`, value)}>
                    {formatCurrency(value)}
                </div>
            ),
        })),
  ];

  return (
    <div className="page-container">
      {contextHolder}
      <h2>Kredi Kartı Durum Takibi</h2>
      
      <Spin spinning={loading}>
        {error && !loading && <div className="error-message">{error}</div>}
        <div className="card-list">
          {!loading && !error && creditCards.map(card => {
            const cardProps = {
              ...card,
              card_number: card.card_number ? `${card.card_number.slice(0, 4)} **** **** ${card.card_number.slice(-4)}` : '',
              expire_date: dayjs(card.expiration_date).format('MM/YY'),
              limit: card.credit_card_limit
            };
            return <CreditCard key={card.id} card={cardProps} />;
          })}
        </div>
      </Spin>

      <div className="pivot-toolbar">
        <DatePicker picker="month" value={selectedMonth} onChange={setSelectedMonth} format="MMMM YYYY" />
        <Radio.Group value={displayMode} onChange={(e) => setDisplayMode(e.target.value)}>
          <Radio.Button value="sabah">Sabah</Radio.Button>
          <Radio.Button value="aksam">Akşam</Radio.Button>
        </Radio.Group>
        <div className="toolbar-spacer" />
        <Button onClick={handleExport} disabled={loading}>Excel'e Aktar</Button>
        <Button type="primary" onClick={() => setEntryModalVisible(true)}>Günlük Giriş Ekle</Button>
      </div>

      <div className="pivot-table-wrapper">
        <Table
          loading={loading}
          columns={columns}
          dataSource={pivotData}
          scroll={{ x: 'max-content' }}
          pagination={false}
          bordered
          // ... (summary kısmı eklenebilir) ...
        />
      </div>

      <CreditCardDailyEntryModal 
        visible={isEntryModalVisible} 
        onCancel={() => setEntryModalVisible(false)} 
        onSave={handleSaveEntries} 
        // DÜZELTME: Prop adı ve değeri doğru şekilde gönderiliyor.
        allCreditCards={creditCards} 
        selectedMonth={selectedMonth} 
      />

      {editingCellData && (
        <EditLimitModal
            visible={isEditModalVisible}
            onCancel={() => setEditModalVisible(false)}
            onSave={handleSaveEditedCell}
            cellData={editingCellData}
        />
      )}
    </div>
  );
};

export default CreditCardsPage;
