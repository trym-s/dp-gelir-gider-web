import React, { useState, useEffect, useCallback } from 'react';
import { Button, DatePicker, Radio, Table, message, Modal, Form, InputNumber, Spin, Typography } from 'antd';
import dayjs from 'dayjs';
// DÜZELTME 1: Servis dosyasının adı ve import yolu güncellendi.
// YENİ EKLENEN API FONKSİYONU: Kart bilgilerini güncellemek için
import { getKmhAccounts, getDailyRisksForMonth, saveDailyEntries, updateKmhAccount } from '../../api/KMHStatusService';

// Bileşenleri import ediyoruz
import KMHCard from './KMHCard'; //
import KMHDailyEntryModal from './KMHDailyEntryModal'; //

// Stil dosyalarını import ediyoruz
import '../shared/SharedPageStyles.css';
import './KMHStatusPage.css'; //
import { exportToExcel } from '../reports/exportService';
import { kmhReportConfig } from '../reports/reportConfig';
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
    if (value == null || isNaN(parseFloat(value))) return '-';
    return parseFloat(value).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
};

const KMHStatusPage = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [kmhAccounts, setKmhAccounts] = useState([]);
  const [pivotData, setPivotData] = useState([]);
  const [days, setDays] = useState(() => generateDaysOfMonth(selectedMonth));
  
  const [loading, setLoading] = useState(true);

  const [displayMode, setDisplayMode] = useState('sabah');
  const [isEntryModalVisible, setEntryModalVisible] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [editingCellData, setEditingCellData] = useState(null);
  const [monthlyRisks, setMonthlyRisks] = useState([]);
  // Tüm veriyi çeken ve işleyen ana fonksiyon
  const fetchDataForPage = useCallback(async (year, month) => {
    setLoading(true);
    try {
      const [accounts, risks] = await Promise.all([
        getKmhAccounts(),
        getDailyRisksForMonth(year, month)
      ]);
      
      setKmhAccounts(accounts);
      setMonthlyRisks(risks); // Ham veriyi state'e kaydet

    } catch (error) {
      messageApi.error("Veriler yüklenirken bir hata oluştu.");
      setKmhAccounts([]);
      setMonthlyRisks([]);
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  // DÜZELTME 2: Veri işleme, kaynak veriler veya displayMode değiştiğinde tetiklenen ayrı bir useEffect'e taşındı.
  useEffect(() => {
    if (kmhAccounts.length === 0) {
      setPivotData([]);
      return;
    }

    const pivotMap = {};
    kmhAccounts.forEach(acc => {
      // 'risk' değeri sabah/akşam seçimine göre belirleniyor.
      const riskValue = displayMode === 'sabah' 
        ? acc.current_morning_risk 
        : acc.current_evening_risk;

      pivotMap[acc.id] = {
          key: acc.id,
          banka: acc.bank_name,
          hesap: acc.name,
          limit: acc.kmh_limit,
          risk: riskValue, // Dinamik risk değeri
      };
    });

    monthlyRisks.forEach(risk => {
      if (pivotMap[risk.kmh_limit_id]) {
          const entryDate = dayjs(risk.entry_date).format('DD.MM.YYYY');
          pivotMap[risk.kmh_limit_id][`${entryDate}_sabah`] = risk.morning_risk;
          pivotMap[risk.kmh_limit_id][`${entryDate}_aksam`] = risk.evening_risk;
      }
    });

    setPivotData(Object.values(pivotMap));
  }, [kmhAccounts, monthlyRisks, displayMode]);


  useEffect(() => {
    const year = selectedMonth.year();
    const month = selectedMonth.month() + 1;
    setDays(generateDaysOfMonth(selectedMonth));
    fetchDataForPage(year, month);
  }, [selectedMonth, fetchDataForPage]);

  // --- YENİ EKLENEN FONKSİYON: Karttaki değişiklikleri kaydeder ---
  const handleUpdateAccountDetails = async (updatedAccountData) => {
    // 1. Gelen veriden 'status' alanını da al.
    const { id, kmhLimiti, hesapKesimTarihi, status } = updatedAccountData;

    // 2. API'ye gönderilecek payload'ı backend'in beklediği anahtarlarla oluştur.
    // 'statement_date' -> 'statement_day' olarak düzeltildi.
    // 'status' alanı eklendi.
    const payload = {
      kmh_limit: kmhLimiti,
      statement_day: hesapKesimTarihi,
      status: status
    };

    try {
      // Artık 'status' bilgisini de içeren payload gönderiliyor.
      const response = await updateKmhAccount(id, payload);

      // Arayüzdeki state'i anında güncelle (bu kısım doğruydu)
      setKmhAccounts(prevAccounts =>
        prevAccounts.map(account => {
          if (account.id === id) {
            return {
              ...account,
              kmh_limit: kmhLimiti,
              statement_date_str: hesapKesimTarihi,
              status: status // State'i de yeni status ile güncelle
            };
          }
          return account;
        })
      );

      messageApi.success("Hesap bilgileri başarıyla güncellendi.");

    } catch (error) {
      messageApi.error("Hesap bilgileri güncellenirken bir hata oluştu.");
    }
};
  const handleSaveEntries = async (entries) => {
    try {
      // DÜZELTME: Tarih formatlaması eklendi.
      const formattedEntries = entries.map(entry => ({
        ...entry,
        tarih: dayjs(entry.tarih, 'DD.MM.YYYY').format('YYYY-MM-DD'),
      }));
      const response = await saveDailyEntries(formattedEntries);
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
    const datePart = dataIndex.split('_')[0];
    const clickedDate = dayjs(datePart, 'DD.MM.YYYY');

    // --- YENİ EKLENEN KONTROL ---
    if (clickedDate.isAfter(dayjs(), 'day')) {
        messageApi.warning('Gelecek tarihler için bu ekrandan işlem yapılamaz.');
        return;
    }
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
        await handleSaveEntries(payload); // saveDailyEntries'i çağıran ana fonksiyonu kullan
      } catch (error) {
        messageApi.error(error.message || "Değer güncellenirken bir hata oluştu.");
      } finally {
        setEditModalVisible(false);
      }
  };

  const handleExport = () => {
        // 1. Her bir KMH hesabı için doğru "Risk" değerini, o ayın detaylı verilerinden (`monthlyRisks`) hesapla.
        const mainDataForExport = kmhAccounts.map(acc => {
            
            // İlgili hesaba ait tüm aylık risk girişlerini bul.
            const accountRisks = monthlyRisks.filter(risk => risk.kmh_limit_id === acc.id);
            
            let finalRisk = null;

            if (accountRisks.length > 0) {
                // Risk girişlerini tarihe göre yeniden eskiye doğru sırala.
                accountRisks.sort((a, b) => dayjs(b.entry_date).diff(dayjs(a.entry_date)));
                
                // En üstteki (en yeni) girişi al.
                const latestEntry = accountRisks[0];
                
                // En yeni girişin akşam riski varsa onu, yoksa sabah riskini al.
                finalRisk = latestEntry.evening_risk ?? latestEntry.morning_risk;
            } else {
                // Eğer o ay hiç giriş yoksa, API'den gelen genel özet verisini kullan (fallback).
                finalRisk = acc.current_evening_risk ?? acc.current_morning_risk;
            }
            
            return {
                ...acc,
                // Bu yeni ve DOĞRU alanı `reportConfig` içinde kullanacağız.
                calculated_risk: parseFloat(finalRisk || 0) 
            };
        });

        // 2. Hazırlanan doğru verilerle export fonksiyonunu çağır.
        exportToExcel(kmhReportConfig, mainDataForExport, monthlyRisks, selectedMonth);
  };
  const columns = [
    { title: 'Banka', dataIndex: 'banka', key: 'banka', width: 150 },
    { title: 'Hesap', dataIndex: 'hesap', key: 'hesap', fixed: 'left', width: 160},
    { title: 'Limit', dataIndex: 'limit', key: 'limit', fixed: 'left', width: 130, render: formatCurrency },
    { title: 'Risk', dataIndex: 'risk', key: 'risk', width: 130, render: (value) => <Text type="danger">{formatCurrency(value)}</Text> },
    { 
      title: 'Kullanılabilir limit', 
      key: 'available', 
      fixed: 'left', 
      width: 130, 
      render: (_, record) => {
        const available = parseFloat(record.limit || 0) - parseFloat(record.risk || 0);
        return <Text type="success" strong>{formatCurrency(available)}</Text>;
      }
    },
    ...days.map(day => ({
            title: day,
            dataIndex: `${day}_${displayMode}`,
            key: `${day}_${displayMode}`,
            width: 110, 
            className: 'compact-pivot-cell', // CSS ile stil vermek için class eklendi
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
          {kmhAccounts.map(account => {
            // DÜZELTME: Bu "adaptör" nesnesi, yeni API verisini KMHCard'ın beklediği eski formata dönüştürür.
            const cardProps = {
              ...account,
              bank: { name: account.bank_name }, // 'bank_name'den 'bank' nesnesi oluştur
              kmhLimiti: account.kmh_limit,
              risk: displayMode === 'sabah' ? account.current_morning_risk : account.current_evening_risk,
              hesapKesimTarihi: account.statement_date_str
            };

            return (
              <KMHCard 
                key={account.id} 
                bank={cardProps} 
                // YENİ EKLENDİ: onSave prop'u ile handler'ı karta iletiyoruz.
                onSave={handleUpdateAccountDetails}
              />
            );
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
          sticky
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
              <Table.Summary.Row>
                <Table.Summary.Cell index={1} colSpan={2}><Text strong>Toplam</Text></Table.Summary.Cell>
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
        allKmhAccounts={kmhAccounts} 
        selectedMonth={selectedMonth} 
      />
      {isEditModalVisible && <EditRiskModal visible={isEditModalVisible} onCancel={() => setEditModalVisible(false)} onSave={handleSaveEditedCell} cellData={editingCellData} />}
    </div>
  );
};

export default KMHStatusPage;
