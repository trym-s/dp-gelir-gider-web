import React, { useState, useEffect, useCallback } from 'react';
import {
  Button, Modal, Table, DatePicker, Form, Radio, Spin, message, Dropdown, Card, List, Typography, Avatar, InputNumber
} from 'antd';
import { DownOutlined, HistoryOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import BankCard from './BankCard';
import DailyEntryModal from './DailyEntryModal';
import BankAccountsModal from './BankAccountsModal';
import './BankStatusPage.css';

import { 
  getBanks, 
  getAccounts, 
  getDailyBalances, 
  saveDailyEntries, 
} from '../../api/bankStatusService';

const { Text } = Typography;

// --- YENİ BİLEŞEN: Son Girişler Dropdown Menüsü ---
const LatestEntriesDropdown = ({ banks }) => {
  console.log("DEBUG: Dropdown'a gelen 'banks' verisi:", banks);
  const allAccounts = banks.flatMap(bank => bank.accounts)
    .filter(acc => acc.last_entry_date) // Sadece en az bir girişi olanları göster
    .sort((a, b) => dayjs(b.last_entry_date).diff(dayjs(a.last_entry_date)));

  const menuOverlay = (
    <Card className="latest-entries-dropdown-menu">
      <List
        dataSource={allAccounts}
        locale={{ emptyText: "Görüntülenecek giriş bulunmuyor." }}
        renderItem={(account) => (
          <List.Item className="entry-list-item">
            <List.Item.Meta
              avatar={<Avatar style={{ backgroundColor: '#1890ff' }}>{account.bank_name.charAt(0)}</Avatar>}
              title={<Text strong>{account.name}</Text>}
              description={`${account.bank_name} - Son Giriş: ${dayjs(account.last_entry_date).format('DD.MM.YYYY')}`}
            />
            <div className="last-balance">
              {parseFloat(account.last_evening_balance).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
            </div>
          </List.Item>
        )}
      />
    </Card>
  );

  return (
    <Dropdown overlay={menuOverlay} trigger={['click']}>
      <Button icon={<HistoryOutlined />}>
        Son Girişler <DownOutlined />
      </Button>
    </Dropdown>
  );
};

// EditCellModal'da bir değişiklik yok, aynı kalabilir.
const EditCellModal = ({ visible, onCancel, onSave, cellData }) => {
    const [form] = Form.useForm();
    useEffect(() => { if (visible && cellData) { form.setFieldsValue({ value: cellData.value }); } }, [visible, cellData, form]);
    const handleOk = () => { form.validateFields().then(values => { onSave(cellData.rowKey, cellData.dataIndex, values.value); onCancel(); }); };
    const getModalTitle = () => { if (!cellData) return 'Değer Düzenle'; const parts = cellData.dataIndex.split('_'); const datePart = parts[0]; const timeOfDay = parts[1] === 'sabah' ? 'Sabah' : 'Akşam'; return `${cellData.banka} - ${cellData.hesap} / ${datePart} (${timeOfDay})`; };
    return (<Modal title={getModalTitle()} visible={visible} onCancel={onCancel} onOk={handleOk} okText="Kaydet" cancelText="İptal"><Form form={form} layout="vertical"><Form.Item name="value" label="Yeni Tutar (₺)" rules={[{ required: true, message: 'Lütfen bir tutar girin!' }]}><InputNumber style={{ width: '100%' }} min={0} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/\$\s?|(,*)/g, '')} /></Form.Item></Form></Modal>);
};

const BankStatusPage = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [isDailyEntryModalVisible, setIsDailyEntryModalVisible] = useState(false);
  const [isBankAccountsModalVisible, setIsBankAccountsModalVisible] = useState(false);
  const [selectedBankForModal, setSelectedBankForModal] = useState(null);
  const [pivotData, setPivotData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [days, setDays] = useState([]);
  const [displayMode, setDisplayMode] = useState('sabah');
  const [isEditCellModalVisible, setIsEditCellModalVisible] = useState(false);
  const [editingCellData, setEditingCellData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [banks, setBanks] = useState([]);

  const statusCellClasses = {
      'Pasif': 'cell-pasif',
      'Bloke': 'cell-bloke',
    };
  // Backend'den gelen düz listeyi pivot tablo formatına dönüştürme fonksiyonu
  // Bu fonksiyonu fetchData'dan önce tanımlamak daha temiz bir yapı sağlar.
  const transformBackendDataToPivot = useCallback((backendData, allFetchedAccounts) => {
      const pivotMap = new Map();
      
      allFetchedAccounts.forEach(account => {
          const key = `${account.bank_name}-${account.name}`;
          pivotMap.set(key, { 
              key: key, 
              banka: account.bank_name, 
              hesap: account.name,
              status: account.status, // <-- DÜZELTME: Virgül eklendi
              varlik: account.last_evening_balance
          });
      });

      backendData.forEach(item => {
          const key = `${item.bank_name}-${item.account_name}`;
          if (pivotMap.has(key)) {
              const existingRow = pivotMap.get(key);
              const entryDateFormatted = dayjs(item.entry_date).format('DD.MM.YYYY');
              
              if (item.morning_balance != null) {
                  existingRow[`${entryDateFormatted}_sabah`] = item.morning_balance;
              }
              if (item.evening_balance != null) {
                  existingRow[`${entryDateFormatted}_aksam`] = item.evening_balance;
              }
              if (item.status) {
                  existingRow[`${entryDateFormatted}_status`] = item.status;
              }
          }
      });
      
      return Array.from(pivotMap.values());
  }, []);

  // İYİLEŞTİRME: Veri çekme fonksiyonunu useCallback ile sarmaladık.
  // Bu, fonksiyonun gereksiz yere yeniden oluşturulmasını engeller ve performansı artırır.
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // İYİLEŞTİRME: Promise.all ile iki API isteğini aynı anda gönderiyoruz, bu daha hızlıdır.
      const [fetchedBanks, fetchedAccounts] = await Promise.all([
        getBanks(),
        getAccounts()
      ]);

      // Artık backend'den gelen 'status' bilgisiyle doğru veriyi birleştiriyoruz.
      const combinedData = fetchedBanks.map(bank => {
        const bankAccounts = fetchedAccounts.filter(account => account.bank_id === bank.id);
        return { ...bank, accounts: bankAccounts };
      });
      setBanks(combinedData);

      // Pivot tablo için veri çekme
      const year = selectedMonth.year();
      const month = selectedMonth.month() + 1; 
      const fetchedPivotData = await getDailyBalances(year, month);

      console.log("DEBUG: Daily Balances API'sinden gelen veri:", fetchedPivotData);
      const transformedPivotData = transformBackendDataToPivot(fetchedPivotData, fetchedAccounts);
      setPivotData(transformedPivotData);

    } catch (err) {
      console.error("Veri çekilirken hata:", err);
      setError(err.message || "Veriler yüklenirken bir hata oluştu.");
      messageApi.error(err.message || "Veriler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, messageApi]); // useCallback bağımlılıkları

  useEffect(() => {
    fetchData();
  }, [fetchData]); // useEffect artık fetchData'nın kendisine bağımlı.

  useEffect(() => {
    // Bu useEffect sadece takvim günlerini oluşturmak için ayrıldı, daha temiz.
    const generateDays = () => {
      const start = dayjs(selectedMonth).startOf('month');
      const end = dayjs(selectedMonth).endOf('month');
      const total = end.date();
      const d = [];
      for (let i = 1; i <= total; i++) {
        d.push(dayjs(start).date(i).format('DD.MM.YYYY'));
      }
      return d;
    };
    setDays(generateDays());
  }, [selectedMonth]);

  const handleSaveEntries = async (newEntries) => {
    // Frontend'den gelen tarihin YYYY-MM-DD formatında olduğundan emin olalım
    const formattedEntries = newEntries.map(entry => ({
      ...entry,
      tarih: dayjs(entry.tarih, 'DD.MM.YYYY').format('YYYY-MM-DD'), // DD.MM.YYYY'den YYYY-MM-DD'ye çevir
      sabah: entry.sabah, // Zaten number/null
      aksam: entry.aksam // Zaten number/null
    }));

    try {
      setLoading(true);
      await saveDailyEntries(formattedEntries);
      messageApi.success('Girişler başarıyla kaydedildi!');
      setIsDailyEntryModalVisible(false);

      // Kayıt sonrası veriyi yeniden çekerek tabloyu güncelle
      const year = selectedMonth.year();
      const month = selectedMonth.month() + 1;
      const fetchedPivotData = await getDailyBalances(year, month);
      //const fetchedAccounts = await getAccounts(); // Hesapları da tekrar çekebiliriz, garantici olmak için
      //setAccounts(fetchedAccounts); // Güncel hesap listesini sakla

      const allAccounts = banks.flatMap(b => b.accounts); // Mevcut state'den tüm hesapları alalım
      const transformedPivotData = transformBackendDataToPivot(fetchedPivotData, allAccounts);
      setPivotData(transformedPivotData);


    } catch (err) {
      console.error("Giriş kaydedilirken hata:", err);
      setError(err.message || "Giriş kaydedilirken bir hata oluştu.");
      messageApi.error(err.message || "Giriş kaydedilirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleBankCardClick = (bank) => {
    setSelectedBankForModal(bank);
    setIsBankAccountsModalVisible(true);
  };

  const handleCellClick = (record, dataIndex, value) => {
    // 1. Banka ve Hesap gibi başlık hücrelerine tıklanırsa işlemi durdur.
    if (dataIndex === 'banka' || dataIndex === 'hesap') {
      return;
    }

    // 2. Tıklanan hücrenin tarih bilgisini al (SADECE BİR KERE TANIMLANIYOR).
    const datePart = dataIndex.split('_')[0];
    
    // 3. O güne ait durumu al.
    const dailyStatus = record[`${datePart}_status`] || 'Aktif';
    
    // 4. Günlük duruma göre kontrol yap. Eğer Aktif değilse modalı açma.
    if (dailyStatus !== 'Aktif') {
        message.warning(`Bu tarihte '${dailyStatus}' olan hesapta değişiklik yapılamaz.`);
        return;
    }

    // --- Fonksiyonun geri kalan kısmı (hata kontrolü, gelecek tarih kontrolü vb.) ---

    if (typeof dataIndex !== 'string' || dataIndex === '') {
      console.error('Hata: dataIndex geçersiz bir değer aldı:', dataIndex);
      message.error('Hücre bilgisi okunamadı.');
      return;
    }

    const clickedDate = dayjs(datePart, 'DD.MM.YYYY');
    const today = dayjs();

    if (!clickedDate.isValid()) {
      console.error('Hata: Geçersiz tarih formatı algılandı:', datePart);
      message.error('Hücre tarihi okunamadı.');
      return;
    }

    if (clickedDate.isAfter(today, 'day')) {
      message.warn('Gelecek tarihlerdeki girişler bu ekrandan düzenlenemez.');
      return;
    }

    setEditingCellData({
      rowKey: record.key,
      dataIndex: dataIndex,
      value: value,
      banka: record.banka,
      hesap: record.hesap,
      dateOnly: datePart
    });
    setIsEditCellModalVisible(true);
};

  const handleSaveEditedCell = (rowKey, dataIndex, newValue) => {
    // Burada tekil hücre güncelleme API'si olmadığı için doğrudan pivotData'yı güncellemiyoruz.
    // Eğer bir API endpoint'i olsaydı, onu çağırırdık.
    // Şimdilik sadece frontend'de güncellemeyi simüle edebiliriz veya bu işlevi tamamen kaldırabiliriz.
    // Mevcut POST /daily_entries endpoint'i toplu ve gap kapatmalı olduğu için tekil hücre için ideal değil.
    // Bunun için PUT/PATCH /daily_balances/<account_id>/<date> gibi bir endpoint gerekir.

    // Geçici olarak, backend'e tekil güncelleme göndermek için POST /daily_entries'i kullanırsak:
    const bankName = pivotData.find(row => row.key === rowKey)?.banka;
    const accountName = pivotData.find(row => row.key === rowKey)?.hesap;
    const datePart = dataIndex.split('_')[0]; // DD.MM.YYYY
    const timeOfDay = dataIndex.split('_')[1]; // sabah/aksam

    if (!bankName || !accountName) {
      messageApi.error("Hesap bilgisi bulunamadı.");
      return;
    }

    const currentEntry = pivotData.find(row => row.key === rowKey);
    // Diğer sabah/akşam değerini de korumak için
    const otherValue = timeOfDay === 'sabah' ? currentEntry[`${datePart}_aksam`] : currentEntry[`${datePart}_sabah`];

    const entryToSave = [{
      banka: bankName,
      hesap: accountName,
      tarih: datePart, // DD.MM.YYYY formatında
      sabah: timeOfDay === 'sabah' ? newValue : otherValue,
      aksam: timeOfDay === 'aksam' ? newValue : otherValue
    }];
    // handleSaveEntries zaten tarih formatlamayı ve API çağrısını yapıyor
    handleSaveEntries(entryToSave)
      .then(() => {
        messageApi.success('Hücre değeri güncellendi.');
        setIsEditCellModalVisible(false);
      })
      .catch((err) => {
        console.error("Hücre güncellenirken hata:", err);
        messageApi.error(err.message || "Hücre güncellenirken bir hata oluştu.");
      });
  };
  const formatCurrency = (value) => {
      if (value == null || isNaN(parseFloat(value))) return '-';
      return parseFloat(value).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
  };
  const columns = [
    {
      title: 'Banka',
      dataIndex: 'banka',
      fixed: 'left',
      width: 150,
      className: 'pivot-cell pivot-header fixed-column',
      onCell: (record) => ({
        className: 'fixed-column-cell',
      }),
    },
    {
      title: 'Hesap',
      dataIndex: 'hesap',
      fixed: 'left',
      width: 150,
      className: 'pivot-cell pivot-header fixed-column',
      onCell: (record) => ({
        className: 'fixed-column-cell',
      }),
    },
    { title: 'Varlık', dataIndex: 'varlik', fixed: 'left', width: 120, className: 'fixed-column', render: (value) => <Text strong>{formatCurrency(value)}</Text> },
    ...days.map((day) => ({
      title: day,
      dataIndex: `${day}_${displayMode}`,
      width: 120,
      className: 'pivot-cell',
      render: (val, record) => {
        // --- YENİ RENKLENDİRME MANTIĞI BURADA ---
        
        const dailyStatus = record[`${day}_status`] || 'Aktif';
        let cellClassName = '';

        if (val != null) {
          // 1. Hücrede veri varsa, her zaman 'dolu' sınıfını ata (yeşil olacak)
          cellClassName = 'cell-filled';
        } else {
          // 2. Hücre boşsa, duruma göre sınıf ata
          if (dailyStatus === 'Pasif') {
            cellClassName = 'cell-empty-pasif';
          } else if (dailyStatus === 'Bloke') {
            cellClassName = 'cell-empty-bloke';
          }
          // Not: dailyStatus 'Aktif' ise, ek bir sınıf atamıyoruz.
          // Böylece varsayılan (beyaz) renkte kalacak.
        }

        return (
          <div
            className={`pivot-value ${cellClassName}`}
            onClick={() => handleCellClick(record, `${day}_${displayMode}`, val)}
          >
            {val != null ? `${val.toLocaleString('tr-TR')} ₺` : '-'}
          </div>
        );
      },
    })),
];

   // DailyEntryModal'a gönderilecek hesapları `banks` state'inden türetelim
  const dailyEntryModalAccountOptions = banks.flatMap(bank => 
      bank.accounts.map(acc => ({
          bankName: bank.name,
          accountName: acc.name,
          id: acc.id
      }))
  );

  
  return (
    <div className="bank-status-page">
      {contextHolder}
      
      <h2>Bankalar Cari Durum</h2>

      <div className="bank-card-list">
        {loading && <Spin size="large" className="page-spinner" />}
        {error && <div className="error-message">{error}</div>}
        {!loading && !error && banks.length === 0 && (
          <div className="no-data-message">Hiç banka kaydı bulunamadı.</div>
        )}
        {!loading && !error && banks.map((bank) => (
          <BankCard key={bank.id} bank={bank} onCardClick={() => handleBankCardClick(bank)} />
        ))}
      </div>

      {/* --- TOOLBAR GÜNCELLENDİ --- */}
      <div className="pivot-toolbar">
        <DatePicker
          picker="month"
          value={selectedMonth}
          onChange={(value) => setSelectedMonth(value)}
          allowClear={false}
          format="MMMM YYYY"
        />
         
        <Radio.Group value={displayMode} onChange={(e) => setDisplayMode(e.target.value)} buttonStyle="solid">
            <Radio.Button value="sabah">Sabah</Radio.Button>
            <Radio.Button value="aksam">Akşam</Radio.Button>
        </Radio.Group>

        {/* Ara boşluk bırakmak için bir eleman */}
        <div className="toolbar-spacer" />
        
        {/* Yeni Dropdown menüsü eklendi */}
        {!loading && banks.length > 0 && <LatestEntriesDropdown banks={banks} />}
        
        <Button type="primary" onClick={() => setIsDailyEntryModalVisible(true)} disabled={loading}>
          Günlük Giriş Ekle
        </Button>
      </div>

      <div className="pivot-table-wrapper">
        {loading && <Spin size="large" className="table-spinner" />}
        {!loading && !error && pivotData.length === 0 && (
             <div className="no-data-message">Seçilen ay için hiç bakiye kaydı bulunamadı.</div>
        )}
        {!loading && !error && (
          <Table
          dataSource={pivotData}
          columns={columns}
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={false}
          bordered
          // --- YENİ PROP'U BURAYA EKLEYİN ---
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
                <Table.Summary.Cell index={0} colSpan={2}>Toplam</Table.Summary.Cell>
                <Table.Summary.Cell index={2}><Text strong>{formatCurrency(totals.varlik)}</Text></Table.Summary.Cell>
                {days.map((day, index) => (
                  <Table.Summary.Cell key={index} index={3 + index}>
                    {formatCurrency(totals[`${day}_${displayMode}`])}
                  </Table.Summary.Cell>
                ))}
              </Table.Summary.Row>
            );
          }}
        />
        )}
      </div>

      <DailyEntryModal
        visible={isDailyEntryModalVisible}
        onCancel={() => setIsDailyEntryModalVisible(false)}
        onSave={handleSaveEntries}
        selectedMonth={selectedMonth}
      />

      {selectedBankForModal && (
        <BankAccountsModal
          visible={isBankAccountsModalVisible}
          onCancel={() => setIsBankAccountsModalVisible(false)}
          onDataUpdate={fetchData} 
          bank={selectedBankForModal}
        />
      )}

      {editingCellData && (
        <EditCellModal
          visible={isEditCellModalVisible}
          onCancel={() => setIsEditCellModalVisible(false)}
          onSave={handleSaveEditedCell}
          cellData={editingCellData}
        />
      )}
    </div>
  );
};

export default BankStatusPage;