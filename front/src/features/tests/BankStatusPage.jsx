import React, { useState, useEffect, useCallback } from 'react';
import { Button, Modal, Table, DatePicker, InputNumber, Form, Radio, Spin, message } from 'antd';
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

// EditCellModal'da bir değişiklik yok, aynı kalabilir.
const EditCellModal = ({ visible, onCancel, onSave, cellData }) => {
    const [form] = Form.useForm();
    useEffect(() => { if (visible && cellData) { form.setFieldsValue({ value: cellData.value }); } }, [visible, cellData, form]);
    const handleOk = () => { form.validateFields().then(values => { onSave(cellData.rowKey, cellData.dataIndex, values.value); onCancel(); }); };
    const getModalTitle = () => { if (!cellData) return 'Değer Düzenle'; const parts = cellData.dataIndex.split('_'); const datePart = parts[0]; const timeOfDay = parts[1] === 'sabah' ? 'Sabah' : 'Akşam'; return `${cellData.banka} - ${cellData.hesap} / ${datePart} (${timeOfDay})`; };
    return (<Modal title={getModalTitle()} visible={visible} onCancel={onCancel} onOk={handleOk} okText="Kaydet" cancelText="İptal"><Form form={form} layout="vertical"><Form.Item name="value" label="Yeni Tutar (₺)" rules={[{ required: true, message: 'Lütfen bir tutar girin!' }]}><InputNumber style={{ width: '100%' }} min={0} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/\$\s?|(,*)/g, '')} /></Form.Item></Form></Modal>);
};
const statusRowColors = {
  'Pasif': 'status-row-pasif',
  'Bloke': 'status-row-bloke',
  'Aktif': 'status-row-aktif', // Aktif için de bir sınıf tanımlayalım
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
  
  // Backend'den gelen düz listeyi pivot tablo formatına dönüştürme fonksiyonu
  // Bu fonksiyonu fetchData'dan önce tanımlamak daha temiz bir yapı sağlar.
  const transformBackendDataToPivot = (backendData, allFetchedAccounts) => {
    const pivotMap = new Map();
    allFetchedAccounts.forEach(account => {
        const key = `${account.bank_name}-${account.name}`;
        pivotMap.set(key, { key: key, banka: account.bank_name, hesap: account.name, status: account.status  });
    });
    backendData.forEach(item => {
        const key = `${item.bank_name}-${item.account_name}`;
        if (pivotMap.has(key)) {
            const existingRow = pivotMap.get(key);
            const entryDateFormatted = dayjs(item.entry_date).format('DD.MM.YYYY');
            if (item.morning_balance != null) existingRow[`${entryDateFormatted}_sabah`] = item.morning_balance;
            if (item.evening_balance != null) existingRow[`${entryDateFormatted}_aksam`] = item.evening_balance;
            pivotMap.set(key, existingRow);
        }
    });
    return Array.from(pivotMap.values());
  };

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
    if (record.status !== 'Aktif') {
        message.warning(`'${record.status}' durumundaki hesaplarda geçmişe yönelik değişiklik yapılamaz.`);
        return;
    }
    if (dataIndex === 'banka' || dataIndex === 'hesap') {
      return;
    }

    console.log('Tıklanan dataIndex:', dataIndex, 'Tipi:', typeof dataIndex);
    if (typeof dataIndex !== 'string' || dataIndex === '') {
      console.error('Hata: dataIndex geçersiz bir değer aldı (string değil veya boş):', dataIndex);
      console.error('Hücre bilgisi okunamadı. Lütfen destek ile iletişime geçin.');
      return;
    }

    const datePart = dataIndex.split('_')[0];
    const clickedDate = dayjs(datePart, 'DD.MM.YYYY');
    const today = dayjs();

    console.log('Parsed clickedDate:', clickedDate.format('DD.MM.YYYY'), 'IsValid:', clickedDate.isValid());
    console.log('Today:', today.format('DD.MM.YYYY'));
    console.log('isAfter today?', clickedDate.isAfter(today, 'day'));


    if (!clickedDate.isValid()) {
      console.error('Hata: dataIndex üzerinden geçersiz tarih formatı algılandı:', datePart, 'Original dataIndex:', dataIndex);
      console.error('Hücre tarihi okunamadı. Lütfen destek ile iletişime geçin.');
      return;
    }

    if (clickedDate.isAfter(today, 'day')) {
      console.warn('Gelecek tarihlerdeki girişler pivot tablo üzerinden düzenlenemez.');
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
    ...days.map((day) => ({
      title: day,
      dataIndex: `${day}_${displayMode}`,
      width: 120,
      className: 'pivot-cell',
      render: (val, record) => (
        <div
          className={`pivot-value ${val !== null && val !== undefined ? 'filled' : 'empty'}`}
          onClick={() => handleCellClick(record, `${day}_${displayMode}`, val)}
        >
          {val !== null && val !== undefined ? `${val.toLocaleString('tr-TR')} ₺` : '-'}
        </div>
      ),
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
            scroll={{ x: 'max-content' }}
            pagination={false}
            bordered={false}
            className="pivot-table"
            onRow={(record) => {
              return {
                className: statusRowColors[record.status] || ''
              };
            }}
          />
        )}
      </div>

      <DailyEntryModal
        visible={isDailyEntryModalVisible}
        onCancel={() => setIsDailyEntryModalVisible(false)}
        onSave={handleSaveEntries}
        allBankAccounts={dailyEntryModalAccountOptions} // Backend'den gelen hesapları gönder
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