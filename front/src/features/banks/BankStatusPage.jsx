//güncel
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
import { exportToExcel } from '../reports/exportService';
import { accountStatusReportConfig } from '../reports/reportConfig';
import { 
  getAccounts, 
  getDailyBalances, 
  saveDailyEntries, 
} from '../../api/bankStatusService';

const { Text } = Typography;

// --- Bileşenler ---

const LatestEntriesDropdown = ({ accounts }) => {
  const sortedAccounts = [...accounts]
    .filter(acc => acc.last_entry_date)
    .sort((a, b) => dayjs(b.last_entry_date).diff(dayjs(a.last_entry_date)));

  const menuOverlay = (
    <Card className="latest-entries-dropdown-menu">
      <List
        dataSource={sortedAccounts}
        locale={{ emptyText: "Görüntülenecek giriş bulunmuyor." }}
        renderItem={(account) => (
          <List.Item className="entry-list-item">
            <List.Item.Meta
              avatar={<Avatar style={{ backgroundColor: '#1890ff' }}>{account.bank_name.charAt(0)}</Avatar>}
              title={<Text strong>{account.name}</Text>}
              description={`${account.bank_name} - Son Giriş: ${dayjs(account.last_entry_date).format('DD.MM.YYYY')}`}
            />
            <div className="last-balance">
              {account.last_evening_balance != null && parseFloat(account.last_evening_balance).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
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

const EditCellModal = ({ visible, onCancel, onSave, cellData }) => {
    const [form] = Form.useForm();
    useEffect(() => { if (visible && cellData) { form.setFieldsValue({ value: cellData.value }); } }, [visible, cellData, form]);
    const handleOk = () => { form.validateFields().then(values => { onSave(cellData.rowKey, cellData.dataIndex, values.value); onCancel(); }); };
    const getModalTitle = () => { if (!cellData) return 'Değer Düzenle'; const parts = cellData.dataIndex.split('_'); const datePart = parts[0]; const timeOfDay = parts[1] === 'sabah' ? 'Sabah' : 'Akşam'; return `${cellData.banka} - ${cellData.hesap} / ${datePart} (${timeOfDay})`; };
    return (<Modal title={getModalTitle()} visible={visible} onCancel={onCancel} onOk={handleOk} okText="Kaydet" cancelText="İptal"><Form form={form} layout="vertical"><Form.Item name="value" label="Yeni Tutar (₺)" rules={[{ required: true, message: 'Lütfen bir tutar girin!' }]}><InputNumber style={{ width: '100%' }} min={0} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/\$\s?|(,*)/g, '')} /></Form.Item></Form></Modal>);
};

// --- Ana Sayfa Bileşeni ---

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
  const [accounts, setAccounts] = useState([]);
  const [monthlyBalances, setMonthlyBalances] = useState([]);
  // --- Yardımcı Fonksiyonlar ---

  const getGroupedBanks = () => {
    if (!accounts || accounts.length === 0) return [];
    const banksMap = new Map();
    accounts.forEach(account => {
      if (!banksMap.has(account.bank_id)) {
        banksMap.set(account.bank_id, {
          id: account.bank_id,
          name: account.bank_name,
          accounts: []
        });
      }
      banksMap.get(account.bank_id).accounts.push(account);
    });
    return Array.from(banksMap.values());
  };
  
  const groupedBanks = getGroupedBanks();

  // --- Veri Çekme ve İşleme ---

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const year = selectedMonth.year();
      const month = selectedMonth.month() + 1; 

      // İki API isteğini aynı anda yap
      const [fetchedAccounts, fetchedMonthlyBalances] = await Promise.all([
        getAccounts(),
        getDailyBalances(year, month)
      ]);
      
      setAccounts(fetchedAccounts);
      setMonthlyBalances(fetchedMonthlyBalances); // Ham veriyi state'e kaydet

    } catch (err) {
      console.error("Veri çekilirken hata:", err);
      const errorMessage = err.message || "Veriler yüklenirken bir hata oluştu.";
      setError(errorMessage);
      messageApi.error(errorMessage);
    } finally {
      setLoading(false);
    }
    // DÜZELTME: Gereksiz bağımlılıklar kaldırıldı.
  }, [selectedMonth, messageApi]);

  // DÜZELTME: Veri çekme (fetch) ve veri işleme (transform) birbirinden ayrıldı.
  // Bu useEffect, kaynak veriler (accounts, monthlyBalances) veya gösterim modu (displayMode)
  // değiştiğinde tetiklenir ve pivot tabloyu yeniden oluşturur.
  useEffect(() => {
    if (accounts.length === 0) {
        setPivotData([]); // Hesap yoksa pivotu boşalt
        return;
    };

    const pivotMap = new Map();
    
    accounts.forEach(account => {
        const key = `${account.bank_name}-${account.name}`;
        // DEĞİŞİKLİK 1: 'varlik' değeri sabah/akşam seçimine göre belirleniyor.
        const varlikValue = displayMode === 'sabah' 
          ? account.last_morning_balance 
          : account.last_evening_balance;

        pivotMap.set(key, { 
            key: key, 
            banka: account.bank_name, 
            hesap: account.name,
            status: account.status,
            varlik: varlikValue
        });
    });

    monthlyBalances.forEach(item => {
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
    
    setPivotData(Array.from(pivotMap.values()));
  }, [accounts, monthlyBalances, displayMode]);


  // Ana veri çekme tetikleyicisi
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Takvim günlerini oluşturma
  useEffect(() => {
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

  // --- Olay Yöneticileri (Event Handlers) ---

  const handleSaveEntries = async (newEntries) => {
    try {
      setLoading(true);
      const formattedEntries = newEntries.map(entry => ({
        ...entry,
        tarih: dayjs(entry.tarih, 'DD.MM.YYYY').format('YYYY-MM-DD'),
      }));
      await saveDailyEntries(formattedEntries);
      messageApi.success('Girişler başarıyla kaydedildi!');
      setIsDailyEntryModalVisible(false);
      fetchData();
    } catch (err) {
      console.error("Giriş kaydedilirken hata:", err);
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
    if (!dataIndex || dataIndex === 'banka' || dataIndex === 'hesap' || dataIndex === 'varlik') return;
    const datePart = dataIndex.split('_')[0];

    const clickedDate = dayjs(datePart, 'DD.MM.YYYY');
    // Eğer tıklanan tarih bugünden sonraysa, uyarı ver ve işlemi durdur.
    if (clickedDate.isAfter(dayjs(), 'day')) {
        messageApi.warning('Gelecek tarihlerdeki girişler bu ekrandan düzenlenemez.'); // 'message.warn' yerine 'messageApi.warning' kullanıldı.
        return; // Fonksiyonun devam etmesini engelle.
    }
    const dailyStatus = record[`${datePart}_status`] || 'Aktif';
    if (dailyStatus !== 'Aktif') {
        messageApi.warning(`Bu tarihte '${dailyStatus}' olan hesapta değişiklik yapılamaz.`);
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
    const bankName = pivotData.find(row => row.key === rowKey)?.banka;
    const accountName = pivotData.find(row => row.key === rowKey)?.hesap;
    const datePart = dataIndex.split('_')[0];
    const timeOfDay = dataIndex.split('_')[1];

    if (!bankName || !accountName) {
      messageApi.error("Hesap bilgisi bulunamadı.");
      return;
    }

    const currentEntry = pivotData.find(row => row.key === rowKey);
    const otherValue = timeOfDay === 'sabah' ? currentEntry[`${datePart}_aksam`] : currentEntry[`${datePart}_sabah`];

    const entryToSave = [{
      banka: bankName,
      hesap: accountName,
      tarih: datePart,
      sabah: timeOfDay === 'sabah' ? newValue : otherValue,
      aksam: timeOfDay === 'aksam' ? newValue : otherValue
    }];
    
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
  const handleExport = () => {
        exportToExcel(accountStatusReportConfig, accounts, monthlyBalances, selectedMonth);
  };
  // --- Tablo Sütunları ---

  const columns = [
    { title: 'Banka', dataIndex: 'banka', fixed: 'left', width: 150, className: 'fixed-column' },
    { title: 'Hesap', dataIndex: 'hesap', fixed: 'left', width: 150, className: 'fixed-column' },
    { title: 'Varlık', dataIndex: 'varlik', fixed: 'left', width: 120, className: 'fixed-column', render: (value) => <Text strong>{formatCurrency(value)}</Text> },
    ...days.map((day) => ({
      title: day,
      dataIndex: `${day}_${displayMode}`,
      width: 120,
      className: 'pivot-cell',
      render: (val, record) => {
        const dailyStatus = record[`${day}_status`] || 'Aktif';
        let cellClassName = '';
        if (val != null) {
          cellClassName = 'cell-filled';
        } else {
          if (dailyStatus === 'Pasif') cellClassName = 'cell-empty-pasif';
          else if (dailyStatus === 'Bloke') cellClassName = 'cell-empty-bloke';
        }
        return (
          <div
            className={`pivot-value ${cellClassName}`}
            onClick={() => handleCellClick(record, `${day}_${displayMode}`, val)}
          >
            {val != null ? `${parseFloat(val).toLocaleString('tr-TR')} ₺` : '-'}
          </div>
        );
      },
    })),
  ];
  
  // --- JSX Render ---

  return (
    <div className="bank-status-page">
      {contextHolder}
      <h2 className="page-title">Bankalar Cari Durum</h2>
      <div className="bank-card-list">
        {loading && <Spin size="large" className="page-spinner" />}
        {error && !loading && <div className="error-message">{error}</div>}
        {!loading && !error && groupedBanks.length === 0 && (
          <div className="no-data-message">Hiç banka kaydı bulunamadı.</div>
        )}
        {!loading && !error && groupedBanks.map((bank) => (
          <BankCard key={bank.id} bank={bank} onCardClick={() => handleBankCardClick(bank)} />
        ))}
      </div>
      <div className="pivot-toolbar">
        <DatePicker
          picker="month"
          value={selectedMonth}
          onChange={setSelectedMonth}
          allowClear={false}
          format="MMMM YYYY"
        />
        <Radio.Group value={displayMode} onChange={(e) => setDisplayMode(e.target.value)} buttonStyle="solid">
            <Radio.Button value="sabah">Sabah</Radio.Button>
            <Radio.Button value="aksam">Akşam</Radio.Button>
        </Radio.Group>
        <div className="toolbar-spacer" />
        <Button onClick={handleExport} disabled={loading}>Excel'e Aktar</Button>
        {!loading && accounts.length > 0 && <LatestEntriesDropdown accounts={accounts} />}
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
        accounts={accounts}
      />
      {selectedBankForModal && (
        <BankAccountsModal
          visible={isBankAccountsModalVisible}
          onCancel={() => setSelectedBankForModal(null)}
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
