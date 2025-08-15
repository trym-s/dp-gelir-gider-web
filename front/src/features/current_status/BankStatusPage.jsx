// src/features/current_status/BankStatusPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Modal, Table, DatePicker, Form, Radio, Spin, message, Dropdown, Card, List, Typography, Avatar, InputNumber } from 'antd';
import { DownOutlined, HistoryOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'; // <-- BU SATIRI EKLEYİN
import { LockOutlined } from '@ant-design/icons'; // <-- BU SATIRI EKLEYİN

import BankCard from './BankCard';
import DailyEntryModal from './DailyEntryModal';
import BankAccountsModal from './BankAccountsModal';
import './BankStatusPage.css';
import { getBanks } from '../../api/bankService';
import { getBankAccountsWithStatus, getDailyBalances, saveDailyEntries} from '../../api/bankAccountService';
import { exportToExcel } from '../reports/exportService';
import { accountStatusReportConfig } from '../reports/reportConfig';
const { Text } = Typography;

dayjs.extend(isSameOrAfter);
// --- YARDIMCI BİLEŞENLER ---

// Son Girişleri Gösteren Dropdown
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
              // HATA BURADAYDI: account.bank_name yerine account.bank.name kullanılmalı.
              avatar={<Avatar style={{ backgroundColor: '#1890ff' }}>{(account.bank?.name || '?').charAt(0)}</Avatar>}
              title={<Text strong>{account.name}</Text>}
              description={`${account.bank?.name || 'Bilinmeyen Banka'} - Son Giriş: ${dayjs(account.last_entry_date).format('DD.MM.YYYY')}`}
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

// Hücre Düzenleme Modalı
const EditCellModal = ({ visible, onCancel, onSave, cellData }) => {
    const [form] = Form.useForm();
    useEffect(() => { if (visible && cellData) { form.setFieldsValue({ value: cellData.value }); } }, [visible, cellData, form]);
    const handleOk = () => { form.validateFields().then(values => { onSave(cellData.rowKey, cellData.dataIndex, values.value); onCancel(); }); };
    const getModalTitle = () => { if (!cellData) return 'Değer Düzenle'; const parts = cellData.dataIndex.split('_'); const datePart = parts[0]; const timeOfDay = parts[1] === 'sabah' ? 'Sabah' : 'Akşam'; return `${cellData.banka} - ${cellData.hesap} / ${datePart} (${timeOfDay})`; };
    return (<Modal title={getModalTitle()} open={visible} onCancel={onCancel} onOk={handleOk} okText="Kaydet" cancelText="İptal"><Form form={form} layout="vertical"><Form.Item name="value" label="Yeni Tutar (₺)" rules={[{ required: true, message: 'Lütfen bir tutar girin!' }]}><InputNumber style={{ width: '100%' }} min={0} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/\$\s?|(,*)/g, '')} /></Form.Item></Form></Modal>);
};


// --- ANA SAYFA BİLEŞENİ ---

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
    const [accounts, setAccounts] = useState([]);
    const [monthlyBalances, setMonthlyBalances] = useState([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const year = selectedMonth.year();
            const month = selectedMonth.month() + 1;

            const [banksResponse, accountsResponse, monthlyBalancesResponse] = await Promise.all([
                getBanks(),
                getBankAccountsWithStatus(), // DÜZELTME: Doğru fonksiyon çağrılıyor.
                getDailyBalances(year, month)
            ]);
            
            const fetchedBanks = banksResponse?.data || [];
            const fetchedAccounts = accountsResponse || []; // Bu fonksiyon doğrudan datayı döndürüyor.
            const fetchedMonthlyBalances = monthlyBalancesResponse || [];

            if (!Array.isArray(fetchedAccounts)) {
                // Bu kontrol artık hata vermemeli, ama güvenlik için kalabilir.
                throw new Error("Hesap verileri beklenen formatta gelmedi.");
            }
            const combinedBankData = fetchedBanks.map(bank => ({
                ...bank,
                accounts: fetchedAccounts.filter(acc => acc.bank_id === bank.id)
            }));

            setBanks(combinedBankData);
            setAccounts(fetchedAccounts);
            setMonthlyBalances(fetchedMonthlyBalances);

        } catch (err) {
            console.error("Veri çekilirken hata:", err);
            const errorMessage = err.message || "Veriler yüklenirken bir hata oluştu.";
            setError(errorMessage);
            messageApi.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, messageApi]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (accounts.length === 0) {
        setPivotData([]);
        return;
    };

    const pivotMap = new Map();
    accounts.forEach(account => {
        const bankName = account.bank?.name || 'Banka Bilgisi Yok';
        // --- DEĞİŞİKLİK BURADA ---
        const key = `${account.bank.name}-${account.name}`; // Hatalı olan 'account.bank_name' düzeltildi.
        const varlikValue = displayMode === 'sabah' 
            ? account.last_morning_balance 
            : account.last_evening_balance;
        
        pivotMap.set(key, { 
            key: key, 
            banka: bankName,
            hesap: account.name,
            status: account.status,
            // Seçilen değeri Varlık sütununa atıyoruz.
            varlik: varlikValue !== null && varlikValue !== undefined ? parseFloat(varlikValue) : null
        });
    });

    monthlyBalances.forEach(item => {
        const key = `${item.bank_name}-${item.account_name}`;
        if (pivotMap.has(key)) {
            const existingRow = pivotMap.get(key);
            const entryDateFormatted = dayjs(item.entry_date).format('DD.MM.YYYY');
            if (item.morning_balance != null) existingRow[`${entryDateFormatted}_sabah`] = item.morning_balance;
            if (item.evening_balance != null) existingRow[`${entryDateFormatted}_aksam`] = item.evening_balance;
            if (item.status) existingRow[`${entryDateFormatted}_status`] = item.status;
        }
    });
    setPivotData(Array.from(pivotMap.values()));
  }, [accounts, monthlyBalances, displayMode]);

  useEffect(() => {
    const generateDays = () => {
      const start = dayjs(selectedMonth).startOf('month');
      const end = dayjs(selectedMonth).endOf('month');
      const d = [];
      for (let i = 1; i <= end.date(); i++) {
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

      // Mevcut durumu ve başlangıç tarihini al
      const currentStatus = record.status;
      const statusStartDate = record.status_start_date ? dayjs(record.status_start_date) : null;

      // Kontrol: Eğer hesap pasif/bloke ise ve tıklanan tarih bu durumun başladığı tarihten sonraysa işlem yapma
      if ((currentStatus === 'Pasif' || currentStatus === 'Bloke') && statusStartDate && clickedDate.isSameOrAfter(statusStartDate, 'day')) {
          messageApi.warning(`Bu tarihte '${currentStatus}' olan hesapta değişiklik yapılamaz.`);
          return;
      }

      // Önceki gelecek tarih kontrolü de burada kalabilir
      if (clickedDate.isAfter(dayjs(), 'day')) {
          messageApi.warning('Gelecek tarihlerdeki girişler bu ekrandan düzenlenemez.');
          return;
      }

      setEditingCellData({
          rowKey: record.key, dataIndex, value, banka: record.banka, hesap: record.hesap, dateOnly: datePart
      });
      setIsEditCellModalVisible(true);
  };

  const handleSaveEditedCell = (rowKey, dataIndex, newValue) => {
    const bankName = pivotData.find(row => row.key === rowKey)?.banka;
    const accountName = pivotData.find(row => row.key === rowKey)?.hesap;
    const [datePart, timeOfDay] = dataIndex.split('_');
    if (!bankName || !accountName) { messageApi.error("Hesap bilgisi bulunamadı."); return; }
    const currentEntry = pivotData.find(row => row.key === rowKey);
    const otherValue = timeOfDay === 'sabah' ? currentEntry[`${datePart}_aksam`] : currentEntry[`${datePart}_sabah`];
    const entryToSave = [{
      banka: bankName, hesap: accountName, tarih: datePart,
      sabah: timeOfDay === 'sabah' ? newValue : otherValue,
      aksam: timeOfDay === 'aksam' ? newValue : otherValue
    }];
    handleSaveEntries(entryToSave).then(() => {
        messageApi.success('Hücre değeri güncellendi.');
        setIsEditCellModalVisible(false);
    }).catch((err) => {
        messageApi.error(err.message || "Hücre güncellenirken bir hata oluştu.");
    });
  };

  const formatCurrency = (value) => {
    if (value == null || isNaN(parseFloat(value))) return '-';
    return parseFloat(value).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
  };
  const handleExport = () => {
        // 1. Her hesap için doğru "Varlık" değerini, o ayın detaylı verilerinden (`monthlyBalances`) hesapla.
        const mainDataForExport = accounts.map(acc => {
            
            // İlgili hesaba ait tüm aylık girişleri bul.
            const accountBalances = monthlyBalances.filter(balance => 
                balance.bank_name === acc.bank?.name && balance.account_name === acc.name
            );
            
            let finalAsset = null;

            if (accountBalances.length > 0) {
                // Girişleri tarihe göre yeniden eskiye doğru sırala.
                accountBalances.sort((a, b) => dayjs(b.entry_date).diff(dayjs(a.entry_date)));
                
                // En üstteki (en yeni) girişi al.
                const latestEntry = accountBalances[0];
                
                // En yeni girişin akşam değeri varsa onu, yoksa sabah değerini al.
                finalAsset = latestEntry.evening_balance ?? latestEntry.morning_balance;
            } else {
                // Eğer o ay hiç giriş yoksa, yine de genel özet verisini kullan (fallback).
                finalAsset = acc.last_evening_balance ?? acc.last_morning_balance;
            }
            
            return {
                ...acc,
                bank_name: acc.bank?.name,
                // Bu yeni ve DOĞRU alanı `reportConfig` içinde kullanacağız.
                calculated_asset: parseFloat(finalAsset || 0) 
            };
        });

        // 2. Günlük verileri `account_id` ile zenginleştir (bu kısım zaten doğruydu).
        const accountIdMap = new Map(
            mainDataForExport.map(acc => [`${acc.bank_name}-${acc.name}`, acc.id])
        );
        const enrichedMonthlyBalances = monthlyBalances.map(balance => ({
            ...balance,
            account_id: accountIdMap.get(`${balance.bank_name}-${balance.account_name}`)
        }));

        // 3. Hazırlanan doğru verilerle export fonksiyonunu çağır.
        exportToExcel(accountStatusReportConfig, mainDataForExport, enrichedMonthlyBalances, selectedMonth);
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
        const dayDate = dayjs(day, 'DD.MM.YYYY');
        const statusStartDate = record.status_start_date ? dayjs(record.status_start_date) : null;
        const statusEndDate = record.status_end_date ? dayjs(record.status_end_date) : null;
        const currentStatus = record.status;

        let isDisabled = false;
        let isLockedByStatus = false;

        // Hesap pasif veya blokede ise ve tarih aralık kontrolü yap
        if ((currentStatus === 'Pasif' || currentStatus === 'Bloke') && statusStartDate) {
            const isWithinStatusRange = dayDate.isSameOrAfter(statusStartDate, 'day') && (!statusEndDate || dayDate.isSameOrBefore(statusEndDate, 'day'));
            if (isWithinStatusRange) {
                isDisabled = true;
                isLockedByStatus = true;
            }
        }

        // Gelecek tarihleri her zaman kilitle
        if (dayDate.isAfter(dayjs(), 'day')) {
            isDisabled = true;
        }

        const cellClassName = isDisabled ? 'pivot-cell disabled' : 'pivot-cell';
        const cellContent = isLockedByStatus
            ? <Tooltip title={`Bu tarihten itibaren ${record.status}`}><LockOutlined /></Tooltip>
            : formatCurrency(val); // 'val' değeri formatlanarak gösterilmeli

        return (
            <div
                className={cellClassName}
                onClick={() => !isDisabled && handleCellClick(record, `${day}_${displayMode}`, val)}
            >
                {cellContent}
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
        {loading && <Spin size="large" />}
        {error && !loading && <div className="error-message">{error}</div>}
        {!loading && !error && banks.map((bank) => (
          <BankCard key={bank.id} bank={bank} onCardClick={() => handleBankCardClick(bank)} />
        ))}
      </div>

      <div className="pivot-toolbar">
        <DatePicker picker="month" value={selectedMonth} onChange={setSelectedMonth} allowClear={false} format="MMMM YYYY"/>
        <Radio.Group value={displayMode} onChange={(e) => setDisplayMode(e.target.value)} buttonStyle="solid">
            <Radio.Button value="sabah">Sabah</Radio.Button>
            <Radio.Button value="aksam">Akşam</Radio.Button>
        </Radio.Group>
        <div className="toolbar-spacer" />
        <Button onClick={handleExport} disabled={loading}>Excel'e Aktar</Button>
        {!loading && accounts.length > 0 && <LatestEntriesDropdown accounts={accounts} />}
        <Button type="primary" onClick={() => setIsDailyEntryModalVisible(true)} disabled={loading}>Günlük Giriş Ekle</Button>
      </div>

      <div className="pivot-table-wrapper">
        <Spin spinning={loading} size="large">
            {!error && (
              <Table dataSource={pivotData} columns={columns} scroll={{ x: 'max-content' }} pagination={false} bordered
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
                          <Table.Summary.Cell key={index} index={3 + index}>{formatCurrency(totals[`${day}_${displayMode}`])}</Table.Summary.Cell>
                        ))}
                      </Table.Summary.Row>
                    );
                }}
              />
            )}
        </Spin>
      </div>

      <DailyEntryModal visible={isDailyEntryModalVisible} onCancel={() => setIsDailyEntryModalVisible(false)} onSave={handleSaveEntries} allBankAccounts={accounts.filter(acc => acc.status === 'Aktif')} />
      {selectedBankForModal && <BankAccountsModal visible={isBankAccountsModalVisible} onCancel={() => setSelectedBankForModal(null)} onDataUpdate={fetchData} bank={selectedBankForModal}/>}
      {editingCellData && <EditCellModal visible={isEditCellModalVisible} onCancel={() => setIsEditCellModalVisible(false)} onSave={handleSaveEditedCell} cellData={editingCellData}/>}
    </div>
  );
};

export default BankStatusPage;
