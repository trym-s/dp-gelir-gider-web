import React, { useState, useEffect, useRef } from 'react'; // useRef artık kullanılmayacak ama importta kalabilir şimdilik
import { Button, Modal, Table, Tag, DatePicker, InputNumber, Form, Radio } from 'antd';
import { message } from 'antd';

import dayjs from 'dayjs';
import BankCard from './BankCard';
import DailyEntryModal from './DailyEntryModal';
import BankAccountsModal from './BankAccountsModal';
import './BankStatusPage.css';

// EditCellModal aynı dosyada tanımlı
const EditCellModal = ({ visible, onCancel, onSave, cellData }) => {
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
    if (!cellData) return 'Değer Düzenle';
    const parts = cellData.dataIndex.split('_');
    const datePart = parts[0];
    const timeOfDay = parts[1] === 'sabah' ? 'Sabah' : 'Akşam';
    return `${cellData.banka} - ${cellData.hesap} / ${datePart} (${timeOfDay})`;
  };

  return (
    <Modal
      title={getModalTitle()}
      visible={visible}
      onCancel={onCancel}
      onOk={handleOk}
      okText="Kaydet"
      cancelText="İptal"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="value"
          label="Yeni Tutar (₺)"
          rules={[{ required: true, message: 'Lütfen bir tutar girin!' }]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={value => value.replace(/\$\s?|(,*)/g, '')}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
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

  // tableWrapperRef artık kullanılmayacak, kaldırıldı
  // const tableWrapperRef = useRef(null); 

  const mockBanks = [
    {
      name: 'AKBANK',
      status: 'Aktif',
      accounts: [
        { id: 'akbank-hesap1', name: 'Ana Hesap', iban: 'TR30 0001 6545 1234 5678 9012 3456' },
        { id: 'akbank-hesap2', name: 'Döviz Hesabı', iban: 'TR30 0001 6545 9876 5432 1098 7654' },
      ],
    },
    {
      name: 'YAPIKREDI',
      status: 'Pasif',
      accounts: [
        { id: 'yapikredi-hesap1', name: 'Ticari Hesap', iban: 'TR12 0001 9999 1111 2222 3333 4444' },
      ],
    },
    {
      name: 'IS BANKASI',
      status: 'Bloke',
      accounts: [
        { id: 'isbankasi-hesap1', name: 'Yatırım Hesabı', iban: 'TR99 0006 0000 5555 6666 7777 8888' },
        { id: 'isbankasi-hesap2', name: 'Euro Hesabı', iban: 'TR99 0006 0000 9999 8888 7777 6666' },
      ],
    },
    {
      name: 'QNB FINANSBANK',
      status: 'Aktif',
      accounts: [
        { id: 'qnb-hesap1', name: 'Vadesiz TL', iban: 'TR77 0002 0000 1234 5678 9012 3456' },
      ],
    },
    {
      name: 'ZIRAAT BANKASI',
      status: 'Aktif',
      accounts: [
        { id: 'ziraat-hesap1', name: 'Maaş Hesabı', iban: 'TR01 0001 0000 1111 2222 3333 4444' },
        { id: 'ziraat-hesap2', name: 'Çiftçi Hesabı', iban: 'TR01 0001 0000 5555 6666 7777 8888' },
      ],
    },
    {
      name: 'HALKBANK',
      status: 'Pasif',
      accounts: [
        { id: 'halkbank-hesap1', name: 'Ticari Kredi', iban: 'TR02 0001 2000 1234 5678 9012 3456' },
      ],
    },
    {
      name: 'GARANTI BBVA',
      status: 'Aktif',
      accounts: [
        { id: 'garanti-hesap1', name: 'Bireysel Hesap', iban: 'TR88 0006 2000 1234 5678 9012 3456' },
        { id: 'garanti-hesap2', name: 'Kredi Kartı', iban: 'TR88 0006 2000 9876 5432 1098 7654' },
      ],
    },
    {
      name: 'DENIZBANK',
      status: 'Aktif',
      accounts: [
        { id: 'denizbank-hesap1', name: 'Tarım Hesabı', iban: 'TR39 0006 8000 1234 5678 9012 3456' },
      ],
    },
    {
      name: 'TEB',
      status: 'Bloke',
      accounts: [
        { id: 'teb-hesap1', name: 'Şirket Hesabı', iban: 'TR55 0003 2000 1234 5678 9012 3456' },
      ],
    },
  ];

  const allBankAccounts = mockBanks.flatMap(bank =>
    bank.accounts.map(account => ({
      bankName: bank.name,
      accountName: account.name,
      id: account.id,
    }))
  );

  const generateDaysOfMonth = (monthDate) => {
    const start = dayjs(monthDate).startOf('month');
    const end = dayjs(monthDate).endOf('month');
    const total = end.date();
    const d = [];
    for (let i = 1; i <= total; i++) {
      d.push(dayjs(start).date(i).format('DD.MM.YYYY'));
    }
    return d;
  };

  useEffect(() => {
    setDays(generateDaysOfMonth(selectedMonth));

    const today = dayjs().format('DD.MM.YYYY');
    const yesterday = dayjs().subtract(1, 'day').format('DD.MM.YYYY');
    const twoDaysAgo = dayjs().subtract(2, 'day').format('DD.MM.YYYY');
    const threeDaysAgo = dayjs().subtract(3, 'day').format('DD.MM.YYYY');
    const tomorrow = dayjs().add(1, 'day').format('DD.MM.YYYY');
    const dayAfterTomorrow = dayjs().add(2, 'day').format('DD.MM.YYYY');

    setPivotData([
      { key: 'AKBANK-Ana Hesap', banka: 'AKBANK', hesap: 'Ana Hesap', [`${threeDaysAgo}_sabah`]: 1100, [`${threeDaysAgo}_aksam`]: 1150, [`${twoDaysAgo}_sabah`]: 1200, [`${twoDaysAgo}_aksam`]: 1250, [`${yesterday}_sabah`]: 1500, [`${yesterday}_aksam`]: 1550, [`${today}_sabah`]: 1850, [`${today}_aksam`]: 1900, [`${tomorrow}_sabah`]: 2000, [`${tomorrow}_aksam`]: 2050, [`${dayAfterTomorrow}_sabah`]: 2100, [`${dayAfterTomorrow}_aksam`]: 2150, },
      { key: 'AKBANK-Döviz Hesabı', banka: 'AKBANK', hesap: 'Döviz Hesabı', [`${threeDaysAgo}_sabah`]: 400, [`${threeDaysAgo}_aksam`]: 450, [`${twoDaysAgo}_sabah`]: 500, [`${twoDaysAgo}_aksam`]: 550, [`${yesterday}_sabah`]: 600, [`${yesterday}_aksam`]: 650, [`${today}_sabah`]: 700, [`${today}_aksam`]: 750, [`${tomorrow}_sabah`]: 800, [`${tomorrow}_aksam`]: 850, [`${dayAfterTomorrow}_sabah`]: 900, [`${dayAfterTomorrow}_aksam`]: 950, },
      { key: 'YAPIKREDI-Ticari Hesap', banka: 'YAPIKREDI', hesap: 'Ticari Hesap', [`${threeDaysAgo}_sabah`]: 2600, [`${threeDaysAgo}_aksam`]: 2650, [`${twoDaysAgo}_sabah`]: 2727.43, [`${twoDaysAgo}_aksam`]: 2777.43, [`${yesterday}_sabah`]: 2727.43, [`${yesterday}_aksam`]: 2777.43, [`${today}_sabah`]: 3000.0, [`${today}_aksam`]: 3050.0, [`${tomorrow}_sabah`]: 3100.0, [`${tomorrow}_aksam`]: 3150.0, },
      { key: 'IS BANKASI-Yatırım Hesap', banka: 'IS BANKASI', hesap: 'Yatırım Hesabı', [`${threeDaysAgo}_sabah`]: 9000, [`${threeDaysAgo}_aksam`]: 9050, [`${twoDaysAgo}_sabah`]: 10000, [`${twoDaysAgo}_aksam`]: 10050, [`${yesterday}_sabah`]: 9500, [`${yesterday}_aksam`]: 9550, [`${today}_sabah`]: 9000, [`${today}_aksam`]: 9050, [`${tomorrow}_sabah`]: 8800, [`${tomorrow}_aksam`]: 8850, },
      { key: 'QNB FINANSBANK-Vadesiz TL', banka: 'QNB FINANSBANK', hesap: 'Vadesiz TL', [`${yesterday}_sabah`]: 5000, [`${yesterday}_aksam`]: 5050, [`${today}_sabah`]: 4800, [`${today}_aksam`]: 4850, },
      { key: 'ZIRAAT BANKASI-Maaş Hesabı', banka: 'ZIRAAT BANKASI', hesap: 'Maaş Hesabı', [`${yesterday}_sabah`]: 7500, [`${yesterday}_aksam`]: 7550, [`${today}_sabah`]: 7500, [`${today}_aksam`]: 7550, },
      { key: 'GARANTI BBVA-Bireysel Hesap', banka: 'GARANTI BBVA', hesap: 'Bireysel Hesap', [`${yesterday}_sabah`]: 3200, [`${yesterday}_aksam`]: 3250, [`${today}_sabah`]: 3300, [`${today}_aksam`]: 3350, },
      { key: 'HALKBANK-Ticari Kredi', banka: 'HALKBANK', hesap: 'Ticari Kredi', [`${today}_sabah`]: 1000, [`${today}_aksam`]: 1050, },
      { key: 'DENIZBANK-Tarım Hesabı', banka: 'DENIZBANK', hesap: 'Tarım Hesabı', [`${today}_sabah`]: 2000, [`${today}_aksam`]: 2050, },
      { key: 'TEB-Şirket Hesabı', banka: 'TEB', hesap: 'Şirket Hesabı', [`${today}_sabah`]: 500, [`${today}_aksam`]: 550, },
    ]);
  }, [selectedMonth]);

  // Pivot tablo kaydırma useEffect'i kaldırıldı
  // useEffect(() => { ... }, [pivotData, days, displayMode]);


  const handleSaveEntries = (newEntries) => {
    setPivotData((prevData) => {
      const newData = [...prevData];
      newEntries.forEach(newEntry => {
        const rowKey = `${newEntry.banka}-${newEntry.hesap}`;
        let row = newData.find((r) => r.key === rowKey);

        if (!row) {
          row = {
            key: rowKey,
            banka: newEntry.banka,
            hesap: newEntry.hesap,
          };
          newData.push(row);
        }

        if (newEntry.sabah !== undefined && newEntry.sabah !== null) {
          row[`${newEntry.tarih}_sabah`] = newEntry.sabah;
        }
        if (newEntry.aksam !== undefined && newEntry.aksam !== null) {
          row[`${newEntry.tarih}_aksam`] = newEntry.aksam;
        }
      });
      return [...newData];
    });
    messageApi.success('Girişler başarıyla eklendi/güncellendi.');
  };

  const handleBankCardClick = (bank) => {
    setSelectedBankForModal(bank);
    setIsBankAccountsModalVisible(true);
  };

  const handleCellClick = (record, dataIndex, value) => {
    if (dataIndex === 'banka' || dataIndex === 'hesap') {
      return;
    }

    console.log('Tıklanan dataIndex:', dataIndex, 'Tipi:', typeof dataIndex);
    if (typeof dataIndex !== 'string' || dataIndex === '') {
      console.error('Hata: dataIndex geçersiz bir değer aldı (string değil veya boş):', dataIndex);
      console.error('Hücre bilgisi okunamadı. Lütfen destek ile iletişime geçin.'); // Fallback to console.error
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
      console.error('Hücre tarihi okunamadı. Lütfen destek ile iletişime geçin.'); // Fallback to console.error
      return;
    }

    if (clickedDate.isAfter(today, 'day')) {
      console.warn('Gelecek tarihlerdeki girişler pivot tablo üzerinden düzenlenemez.'); // messageApi.warn yerine console.warn
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
    setPivotData(prevData => {
      return prevData.map(row => {
        if (row.key === rowKey) {
          return {
            ...row,
            [dataIndex]: newValue,
          };
        }
        return row;
      });
    });
    messageApi.success('Hücre değeri güncellendi.');
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

  return (
    <div className="bank-status-page">
      {contextHolder}
      
      <h2>Bankalar Cari Durum</h2>

      <div className="bank-card-list">
        {mockBanks.map((bank) => (
          <BankCard key={bank.name} bank={bank} onCardClick={() => handleBankCardClick(bank)} />
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
        <Button type="primary" onClick={() => setIsDailyEntryModalVisible(true)}>
          Günlük Giriş Ekle
        </Button>
      </div>

      <div className="pivot-table-wrapper"> {/* ref={tableWrapperRef} kaldırıldı */}
        <Table
          dataSource={pivotData}
          columns={columns}
          scroll={{ x: 'max-content' }}
          pagination={false}
          bordered={false}
          className="pivot-table"
        />
      </div>

      <DailyEntryModal
        visible={isDailyEntryModalVisible}
        onCancel={() => setIsDailyEntryModalVisible(false)}
        onSave={handleSaveEntries}
        allBankAccounts={allBankAccounts}
        selectedMonth={selectedMonth}
      />

      {selectedBankForModal && (
        <BankAccountsModal
          visible={isBankAccountsModalVisible}
          onCancel={() => setIsBankAccountsModalVisible(false)}
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