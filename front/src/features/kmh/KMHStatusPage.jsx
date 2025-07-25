import React, { useState, useEffect, useCallback } from 'react';
import { Button, DatePicker, Radio, Table, message, Modal, Form, InputNumber, Spin, Typography } from 'antd';
import dayjs from 'dayjs';

// API servislerini import ediyoruz
import { getKmhAccounts, getDailyRisksForMonth, saveDailyEntries } from '../../api/KMHStatusService';

// Bileşenleri import ediyoruz
import KMHCard from './KMHCard';
import KMHDailyEntryModal from './KMHDailyEntryModal';

// Stil dosyalarını import ediyoruz
import '../shared/SharedPageStyles.css';
import './KMHStatusPage.css';

const { Text } = Typography;

// --- EditRiskModal (Değişiklik yok, aynı kalıyor) ---
const EditRiskModal = ({ visible, onCancel, onSave, cellData }) => {
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
    if (!cellData) return `Risk Değeri Düzenle`;
    const parts = cellData.dataIndex.split('_');
    const datePart = parts[0];
    const timeOfDay = parts[1] === 'sabah' ? 'Sabah' : 'Akşam';
    return `${cellData.banka} - ${cellData.hesap} / ${datePart} (${timeOfDay})`;
  };

  return (
    <Modal title={getModalTitle()} visible={visible} onCancel={onCancel} onOk={handleOk} okText="Kaydet" cancelText="İptal" destroyOnClose>
      <Form form={form} layout="vertical" initialValues={{ value: cellData?.value || 0 }}>
        <Form.Item name="value" label="Yeni Risk Tutarı (₺)" rules={[{ required: true, message: `Lütfen bir risk tutarı girin!` }]}>
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

// Para formatlama için yardımcı fonksiyon
const formatCurrency = (value) => {
    if (value == null) return '-';
    return parseFloat(value).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
};

const KMHStatusPage = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  
  const [kmhAccounts, setKmhAccounts] = useState([]);
  const [pivotData, setPivotData] = useState([]);
  const [days, setDays] = useState(generateDaysOfMonth(selectedMonth));
  
  const [loading, setLoading] = useState(true); // Tek bir loading state'i

  const [displayMode, setDisplayMode] = useState('sabah');
  const [isEntryModalVisible, setEntryModalVisible] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [editingCellData, setEditingCellData] = useState(null);

  // Tüm veriyi çeken ve işleyen ana fonksiyon
  const fetchDataForPage = useCallback(async (year, month) => {
    setLoading(true);
    try {
      const accounts = await getKmhAccounts();
      setKmhAccounts(accounts);

      if (!accounts || accounts.length === 0) {
        setPivotData([]);
        return;
      }

      const risks = await getDailyRisksForMonth(year, month);
      
      // --- HATA AYIKLAMA KONTROL NOKTASI ---
      console.log("--- PIVOT VERİ İŞLEME BAŞLANGICI ---");
      console.log("1. Adım: Backend'den gelen hesaplar (kartlar için):", accounts);
      console.log("2. Adım: Backend'den gelen aylık riskler (pivot için):", risks);
      // --- HATA AYIKLAMA SONU ---

      const pivotMap = {};
      accounts.forEach(acc => {
        pivotMap[acc.id] = {
            key: acc.id,
            banka: acc.bank_name,
            hesap: acc.name,
            limit: acc.kmhLimiti,
            risk: acc.risk,
        };
      });

      risks.forEach(risk => {
        if (pivotMap[risk.account_id]) {
            const entryDate = dayjs(risk.entry_date).format('DD.MM.YYYY');
            pivotMap[risk.account_id][`${entryDate}_sabah`] = risk.morning_risk;
            pivotMap[risk.account_id][`${entryDate}_aksam`] = risk.evening_risk;
        } else {
            // --- HATA AYIKLAMA KONTROL NOKTASI ---
            console.warn(`UYARI: Risk verisi için hesap bulunamadı! account_id: ${risk.account_id}. Bu risk verisi atlanacak.`);
            // --- HATA AYIKLAMA SONU ---
        }
      });

      setPivotData(Object.values(pivotMap));

    } catch (error) {
      messageApi.error("Veriler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.");
      setKmhAccounts([]);
      setPivotData([]);
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    const year = selectedMonth.year();
    const month = selectedMonth.month() + 1;
    setDays(generateDaysOfMonth(selectedMonth));
    fetchDataForPage(year, month);
  }, [selectedMonth, fetchDataForPage]);

  const handleSaveEntries = async (entries) => {
    try {
      const response = await saveDailyEntries(entries);
      messageApi.success(response.message || "Girişler başarıyla kaydedildi.");
      const year = selectedMonth.year();
      const month = selectedMonth.month() + 1;
      await fetchDataForPage(year, month); 
      setEntryModalVisible(false);
    } catch (error) {
      messageApi.error(error.message || "Girişler kaydedilirken bir hata oluştu.");
    }
  };

  const handleCellClick = (record, dataIndex, value) => {
      setEditingCellData({ rowKey: record.key, dataIndex, value, banka: record.banka, hesap: record.hesap });
      setEditModalVisible(true);
  };
  
  const handleSaveEditedCell = async (rowKey, dataIndex, newValue) => {
      const [date, time] = dataIndex.split('_');
      const record = pivotData.find(r => r.key === rowKey);

      if (!record) return;

      const payload = [{
          banka: record.banka,
          hesap: record.hesap,
          tarih: date,
          [time]: newValue,
      }];

      try {
        const response = await saveDailyEntries(payload);
        messageApi.success(response.message || "Risk değeri başarıyla güncellendi.");
        const year = selectedMonth.year();
        const month = selectedMonth.month() + 1;
        await fetchDataForPage(year, month);
      } catch (error) {
        messageApi.error(error.message || "Değer güncellenirken bir hata oluştu.");
      } finally {
        setEditModalVisible(false);
      }
  };

  const columns = [
    { title: 'Banka', dataIndex: 'banka', key: 'banka', fixed: 'left', width: 150, className: 'fixed-column' },
    { title: 'Hesap', dataIndex: 'hesap', key: 'hesap', fixed: 'left', width: 150, className: 'fixed-column' },
    { title: 'Limit', dataIndex: 'limit', key: 'limit', fixed: 'left', width: 120, className: 'fixed-column', render: formatCurrency },
    { title: 'Risk', dataIndex: 'risk', key: 'risk', fixed: 'left', width: 120, className: 'fixed-column', render: (value) => <Text type="danger">{formatCurrency(value)}</Text> },
    { 
      title: 'Kullanılabilir', 
      key: 'available', 
      fixed: 'left', 
      width: 120, 
      className: 'fixed-column',
      render: (_, record) => {
        const available = parseFloat(record.limit || 0) - parseFloat(record.risk || 0);
        return <Text type="success" strong>{formatCurrency(available)}</Text>;
      }
    },
    ...days.map(day => ({
      title: day,
      dataIndex: `${day}_${displayMode}`,
      key: `${day}_${displayMode}`,
      width: 120,
      render: (risk, record) => (
        <div className="pivot-cell" onClick={() => handleCellClick(record, `${day}_${displayMode}`, risk)}>
          {formatCurrency(risk)}
        </div>
      ),
    })),
  ];

  return (
    <div className="page-container">
      {contextHolder}
      <h2>KMH Durum Takibi</h2>
      
      <Spin spinning={loading}>
        <div className="card-list">
          {kmhAccounts.map(bank => <KMHCard key={bank.id} bank={bank} onCardClick={() => {}} />)}
        </div>
      </Spin>

      <div className="pivot-toolbar">
        <DatePicker picker="month" value={selectedMonth} onChange={setSelectedMonth} format="MMMM YYYY" />
        <Radio.Group value={displayMode} onChange={(e) => setDisplayMode(e.target.value)}>
          <Radio.Button value="sabah">Sabah</Radio.Button>
          <Radio.Button value="aksam">Akşam</Radio.Button>
        </Radio.Group>
        <div className="toolbar-spacer" />
        <Button type="primary" onClick={() => setEntryModalVisible(true)}>Günlük Risk Ekle</Button>
      </div>

      <div className="pivot-table-wrapper">
        <Table
          columns={columns}
          dataSource={pivotData}
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={false}
          bordered
          summary={pageData => {
            if (pageData.length === 0) return null;
            const totals = {};
            columns.forEach(col => {
                if(col.dataIndex) {
                    totals[col.dataIndex] = pageData.reduce((sum, record) => sum + parseFloat(record[col.dataIndex] || 0), 0);
                } else if (col.key === 'available') {
                    totals.available = pageData.reduce((sum, record) => sum + (parseFloat(record.limit || 0) - parseFloat(record.risk || 0)), 0);
                }
            });

            return (
              <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}>
                <Table.Summary.Cell index={0} colSpan={2}>Toplam</Table.Summary.Cell>
                <Table.Summary.Cell index={2}>{formatCurrency(totals.limit)}</Table.Summary.Cell>
                <Table.Summary.Cell index={3}><Text type="danger">{formatCurrency(totals.risk)}</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={4}><Text type="success" strong>{formatCurrency(totals.available)}</Text></Table.Summary.Cell>
                {days.map((day, index) => (
                  <Table.Summary.Cell key={index} index={5 + index}>
                    {formatCurrency(totals[`${day}_${displayMode}`])}
                  </Table.Summary.Cell>
                ))}
              </Table.Summary.Row>
            );
          }}
        />
      </div>

      <KMHDailyEntryModal 
        visible={isEntryModalVisible} 
        onCancel={() => setEntryModalVisible(false)} 
        onSave={handleSaveEntries} 
        allBankAccounts={kmhAccounts.map(acc => ({ bankName: acc.bank_name, accountName: acc.name, id: acc.id }))} 
        selectedMonth={selectedMonth} 
      />
      {isEditModalVisible && <EditRiskModal visible={isEditModalVisible} onCancel={() => setEditModalVisible(false)} onSave={handleSaveEditedCell} cellData={editingCellData} />}
    </div>
  );
};

export default KMHStatusPage;
