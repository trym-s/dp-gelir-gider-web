import React, { useState, useEffect, useCallback } from 'react';
import { Button, DatePicker, Radio, Table, Typography, Spin, message, Modal, Form, InputNumber, Tooltip } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import CreditCard from './CreditCard'; // Ensure this is the CreditCard component from credit-card-logs
import CreditCardDailyEntryModal from './CreditCardDailyEntryModal';
import CreditCardDetailsModal from './CreditCardDetailsModal';
import { exportToExcel } from '../../reports/exportService';
import { creditCardReportConfig } from '../../reports/reportConfig';
import {
  getCreditCards,
  getDailyLimitsForMonth,
  saveDailyLimits,
  updateCreditCard
} from '../../../api/creditCardService';

import '../../shared/SharedPageStyles.css';
import './CreditCard.css';
import './CreditCardPage.css';

const { Text, Title} = Typography;

dayjs.extend(isSameOrAfter)
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
    <Modal title={getModalTitle()} open={visible} onCancel={onCancel} onOk={handleOk} okText="Kaydet" cancelText="İptal" destroyOnClose>
      <Form form={form} layout="vertical" initialValues={{ value: cellData?.value || 0 }}>
        <Form.Item name="value" label="Yeni Kullanılabilir Limit (₺)" rules={[{ required: true, message: `Lütfen bir tutar girin!` }]}>
          <InputNumber style={{ width: '100%' }} min={0} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/,*/g, '')} autoFocus />
        </Form.Item>
      </Form>
    </Modal>
  );
};

const StatusUpdateModal = ({ visible, onCancel, onOk, account }) => {
  const [form] = Form.useForm();
  const title = account ? `${account.bank_account.bank.name} - ${account.name}` : 'Durum Güncelle';

  useEffect(() => {
    if (visible) {
      form.setFieldsValue({ startDate: dayjs() });
    }
  }, [visible, form]);

  const handleOk = () => {
    form.validateFields().then(values => {
      onOk(values.startDate);
    });
  };

  return (
    <Modal title={title} open={visible} onCancel={onCancel} onOk={handleOk} okText="Kaydet" cancelText="İptal" destroyOnClose>
      <Form form={form} layout="vertical">
        <Form.Item name="startDate" label="Yeni Durumun Başlangıç Tarihi" rules={[{ required: true, message: 'Lütfen bir başlangıç tarihi seçin!' }]}>
          <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
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

  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [isStatusModalVisible, setStatusModalVisible] = useState(false);
  const [statusUpdateInfo, setStatusUpdateInfo] = useState(null);

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
            console.log("Gelen Kredi Kartları (Ham Veri):", fetchedCards);
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
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (creditCards.length === 0 && !loading) {
            setPivotData([]);
            return;
        }

        // Önce aylık veriyi otomatik doldurma mantığıyla işleyelim.
        const filledMonthlyLimits = [];
        creditCards.forEach(card => {
            const cardLimits = monthlyLimits
                .filter(limit => limit.credit_card_id === card.id)
                .sort((a, b) => dayjs(a.entry_date).diff(dayjs(b.entry_date)));
            
            let lastValidLimit = { morning: null, evening: null };
            const monthDays = generateDaysOfMonth(selectedMonth);

            const limitsByDate = new Map(cardLimits.map(l => [dayjs(l.entry_date).format('DD.MM.YYYY'), l]));

            monthDays.forEach(dayStr => {
                const currentDate = dayjs(dayStr, 'DD.MM.YYYY');
                if (currentDate.isAfter(dayjs(), 'day')) return; // Gelecek günler için doldurma yapma

                const dailyEntry = limitsByDate.get(dayStr);
                if (dailyEntry) {
                    lastValidLimit.morning = dailyEntry.morning_limit ?? lastValidLimit.morning;
                    lastValidLimit.evening = dailyEntry.evening_limit ?? lastValidLimit.evening ?? lastValidLimit.morning; // Akşam girilmemişse sabahı devral
                }

                filledMonthlyLimits.push({
                    credit_card_id: card.id,
                    entry_date: currentDate.format('YYYY-MM-DD'),
                    morning_limit: lastValidLimit.morning,
                    evening_limit: lastValidLimit.evening
                });
            });
        });

        const pivotMap = new Map();
        creditCards.forEach(card => {
            const key = card.id;

            // --- DÜZELTME: KARTIN EN SON SABAH VE AKŞAM GİRİŞLERİNİ DOLDURULMUŞ VERİDEN BULUYORUZ ---
            const allCardLimits = filledMonthlyLimits
                .filter(limit => limit.credit_card_id === card.id)
                .sort((a, b) => dayjs(b.entry_date).diff(dayjs(a.entry_date)));

            let availableLimitForPivot;
            const latestEntryWithData = allCardLimits.find(l => l.morning_limit != null || l.evening_limit != null);

            if (!latestEntryWithData) {
                // Kural 2: Eğer bu ay hiç giriş yoksa, kullanılabilir limiti toplam limite eşitle.
                availableLimitForPivot = card.limit;
            } else {
                const latestMorningEntry = allCardLimits.find(l => l.morning_limit != null);
                const latestEveningEntry = allCardLimits.find(l => l.evening_limit != null);
                
                const lastMorningLimit = latestMorningEntry ? latestMorningEntry.morning_limit : card.limit;
                const lastEveningLimit = latestEveningEntry ? latestEveningEntry.evening_limit : lastMorningLimit;

                availableLimitForPivot = displayMode === 'sabah' ? lastMorningLimit : lastEveningLimit;
            }
            
            pivotMap.set(key, { 
                key: key, 
                banka: card.bank_account?.bank?.name || card.bank_name,
                kart_adi: card.name,
                kart_no: card.credit_card_no,
                limit: parseFloat(card.limit || 0),
                kullanilabilir: parseFloat(availableLimitForPivot || 0),
                status: card.status, // Durum bilgisini ekle
                status_start_date: card.status_start_date // Durum başlangıç tarihini ekle
            });
        });
        
        // Pivot tablo hücrelerini doldururken orijinal (doldurulmamış) veriyi kullan
        monthlyLimits.forEach(item => {
            const key = item.credit_card_id;
            if (pivotMap.has(key)) {
                const existingRow = pivotMap.get(key);
                const entryDateFormatted = dayjs(item.entry_date).format('DD.MM.YYYY');
                if (item.morning_limit != null) existingRow[`${entryDateFormatted}_sabah`] = parseFloat(item.morning_limit);
                if (item.evening_limit != null) existingRow[`${entryDateFormatted}_aksam`] = parseFloat(item.evening_limit);
            }
        });
        
        setPivotData(Array.from(pivotMap.values()));
    }, [creditCards, monthlyLimits, displayMode, loading, selectedMonth]);

    useEffect(() => {
        setDays(generateDaysOfMonth(selectedMonth));
    }, [selectedMonth]);
  
  const handleSaveEntries = async (entries) => {
    setLoading(true);
    try {
      const finalPayload = [];
      const entriesByCard = entries.reduce((acc, entry) => {
        if (!acc[entry.credit_card_id]) acc[entry.credit_card_id] = [];
        acc[entry.credit_card_id].push(entry);
        return acc;
      }, {});
  
      for (const cardId in entriesByCard) {
        const cardEntries = entriesByCard[cardId];
        const card = creditCards.find(c => c.id == cardId);
        
        for (const entry of cardEntries) {
          const newEntryDate = dayjs(entry.tarih, 'DD.MM.YYYY');
          
          const lastKnownLimit = [...monthlyLimits, ...finalPayload]
            .filter(l => l.credit_card_id == cardId && dayjs(l.entry_date || l.tarih).isBefore(newEntryDate))
            .sort((a, b) => dayjs(b.entry_date || b.tarih).diff(dayjs(a.entry_date || a.tarih)))[0];
          
          if (lastKnownLimit) {
            const lastKnownDate = dayjs(lastKnownLimit.entry_date || lastKnownLimit.tarih);
            
            // ### YENİ EKLENEN KURAL ###
            // Son bilinen günün akşamı boşsa, onu sabah değeriyle doldurmak için bir kayıt ekle.
            if (lastKnownLimit.evening_limit === null || lastKnownLimit.evening_limit === undefined) {
              finalPayload.push({
                credit_card_id: Number(cardId),
                tarih: lastKnownDate.format('YYYY-MM-DD'),
                sabah: lastKnownLimit.morning_limit,
                aksam: lastKnownLimit.morning_limit
              });
            }
            
            const fillValue = lastKnownLimit.evening_limit ?? lastKnownLimit.morning_limit;
            let fillDate = lastKnownDate.add(1, 'day');
            
            while (fillDate.isBefore(newEntryDate, 'day')) {
              finalPayload.push({
                credit_card_id: Number(cardId),
                tarih: fillDate.format('YYYY-MM-DD'),
                sabah: fillValue,
                aksam: fillValue
              });
              fillDate = fillDate.add(1, 'day');
            }
          }
  
          const lastValueBeforeNewEntry = [...monthlyLimits, ...finalPayload]
             .filter(r => (r.credit_card_id == cardId) && dayjs(r.entry_date || r.tarih).isBefore(newEntryDate))
             .sort((a, b) => dayjs(b.entry_date || b.tarih).diff(dayjs(a.entry_date || a.tarih)))[0];
          
          // Eğer hiç kayıt yoksa, doldurma değeri olarak kartın kendi limitini kullan.
          const fillValueForNewDay = lastValueBeforeNewEntry 
              ? (lastValueBeforeNewEntry.evening_limit ?? lastValueBeforeNewEntry.morning_limit) 
              : (card ? parseFloat(card.limit) : null);
  
          if (entry.sabah !== undefined && entry.sabah !== null && (entry.aksam === undefined || entry.aksam === null)) {
            finalPayload.push({ ...entry, tarih: newEntryDate.format('YYYY-MM-DD'), sabah: entry.sabah, aksam: null });
          } 
          else if ((entry.sabah === undefined || entry.sabah === null) && entry.aksam !== undefined && entry.aksam !== null) {
            finalPayload.push({ ...entry, tarih: newEntryDate.format('YYYY-MM-DD'), sabah: fillValueForNewDay, aksam: entry.aksam });
          }
          else {
            finalPayload.push({ ...entry, tarih: newEntryDate.format('YYYY-MM-DD'), sabah: entry.sabah, aksam: entry.aksam });
          }
        }
      }
      
      await saveDailyLimits(finalPayload);
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
        const totalLimit = parseFloat(card.limit); // Use card.limit here
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

  const handleCardClick = (card) => {
    setSelectedCard(card);
    setIsDetailsModalVisible(true);
  };

  const handleExport = () => {
        // 1. Her bir kredi kartı için doğru verileri manuel olarak hazırla.
        const mainDataForExport = creditCards.map(card => {
            
            // a. Banka adını düz bir alana ata.
            const bankName = card.bank_account?.bank?.name || card.bank_name || 'Bilinmeyen Banka';

            // b. İlgili karta ait tüm aylık limit girişlerini bul.
            const cardLimits = monthlyLimits.filter(limit => limit.credit_card_id === card.id);
            
            let finalAvailableLimit = card.available_limit; // Varsayılan değer

            if (cardLimits.length > 0) {
                // Limit girişlerini tarihe göre yeniden eskiye doğru sırala.
                cardLimits.sort((a, b) => dayjs(b.entry_date).diff(dayjs(a.entry_date)));
                
                // En üstteki (en yeni) girişi al.
                const latestEntry = cardLimits[0];
                
                // En yeni girişin akşam limiti varsa onu, yoksa sabah limitini al.
                finalAvailableLimit = latestEntry.evening_limit ?? latestEntry.morning_limit;
            }
            
            return {
                ...card,
                bank_name: bankName, // Düzeltilmiş banka adı
                // DÜZELTME: `reportConfig`'in beklediği alan adıyla eşleştir.
                limit: card.limit, 
                // Bu yeni ve DOĞRU alanı `reportConfig` içinde kullanacağız.
                calculated_available_limit: parseFloat(finalAvailableLimit || 0) 
            };
        });

        // 2. Hazırlanan doğru verilerle export fonksiyonunu çağır.
        exportToExcel(creditCardReportConfig, mainDataForExport, monthlyLimits, selectedMonth);
  };
const handleUpdateCardDetails = async (updatedCardData) => {
      const { id, status } = updatedCardData; // Sadece status değişikliği önemli
      const originalCard = creditCards.find(c => c.id === id);

      if (!originalCard) {
          messageApi.error("Kart bulunamadı, güncelleme yapılamadı.");
          return;
      }
      
      const statusChanged = originalCard.status !== status;

      // Eğer durum "Pasif" veya "Bloke" olarak değiştiyse, tarih sormak için modalı aç
      if (statusChanged && (status === 'Pasif' || status === 'Bloke')) {
          setStatusUpdateInfo({ ...updatedCardData, originalCard });
          setStatusModalVisible(true);
          return; // API çağrısını durdur, modalın sonucunu bekle
      }

      // Diğer tüm durumlar (örn: Aktif'e geçiş) için doğrudan API'yi çağır
      // Not: Bu fonksiyon sadece DURUM güncellemesi yapar. Diğer alanlar (limit vb.) buradan güncellenmez.
      const payload = {
          status: status,
          start_date: dayjs().format('YYYY-MM-DD'),
      };
      
      try {
          setLoading(true);
          await updateCreditCard(id, payload);
          messageApi.success("Kart durumu başarıyla güncellendi.");
          fetchData(); // Listeyi yenile
      } catch (error) {
          messageApi.error("Kart durumu güncellenirken bir hata oluştu.");
      } finally {
          setLoading(false);
          setIsDetailsModalVisible(false); // Detay modalını kapat
      }
  };

  // ### YENİ ###: Tarih modalından gelen sonucu işleyen fonksiyon
  const handleStatusUpdateWithDate = async (startDate) => {
      if (!statusUpdateInfo || !startDate) return;

      const { id, status } = statusUpdateInfo;
      const payload = {
          status: status,
          start_date: startDate.format('YYYY-MM-DD'),
      };

      try {
          setLoading(true);
          await updateCreditCard(id, payload);
          messageApi.success("Kart durumu başarıyla güncellendi.");
          fetchData(); // Listeyi yenile
      } catch (error) {
          messageApi.error("Kart durumu güncellenirken bir hata oluştu.");
      } finally {
          setStatusModalVisible(false);
          setStatusUpdateInfo(null);
          setLoading(false);
          setIsDetailsModalVisible(false); // Detay modalını da kapat
      }
  };


  // ### DEĞİŞİKLİK ###: Pivot tablo kolonları güncellendi
  const columns = [
    { title: 'Banka Adı', dataIndex: 'banka', key: 'banka', fixed: 'left', width: 150 },
    { title: 'Kredi Kartı Adı', dataIndex: 'kart_adi', key: 'kart_adi', fixed: 'left', width: 150 },
    { title: 'Toplam Limit', dataIndex: 'limit', key: 'limit', fixed: 'left', width: 130, render: formatCurrency },
    // Sabitlenmemiş sütunlar
    { title: 'Kullanılabilir Limit', dataIndex: 'kullanilabilir', key: 'kullanilabilir', width: 150, render: (value) => <Text type="success" strong>{formatCurrency(value)}</Text> },
    ...days.map(day => {
        const dayDate = dayjs(day, 'DD.MM.YYYY');
        return {
            title: day,
            dataIndex: `${day}_${displayMode}`,
            key: `${day}_${displayMode}`,
            width: 110,
            className: 'compact-pivot-cell',
            render: (value, record) => {
                const statusStartDate = record.status_start_date ? dayjs(record.status_start_date) : null;
                let isDisabled = false;
                let isLockedByStatus = false;

                if ((record.status === 'Pasif' || record.status === 'Bloke') && statusStartDate) {
                    if (dayDate.isSameOrAfter(statusStartDate, 'day')) {
                        isDisabled = true;
                        isLockedByStatus = true;
                    }
                }

                if (dayDate.isAfter(dayjs(), 'day')) {
                    isDisabled = true;
                }

                const cellClassName = isDisabled ? 'pivot-cell disabled' : 'pivot-cell';
                const cellContent = isLockedByStatus
                    ? <Tooltip title={`Bu tarihten itibaren ${record.status}`}><LockOutlined /></Tooltip>
                    : formatCurrency(value);

                return (
                    <div className={cellClassName} onClick={() => !isDisabled && handleCellClick(record, `${day}_${displayMode}`, value)}>
                        {cellContent}
                    </div>
                );
            },
        };
    }),
  ];
  const tableSummary = (pageData) => {
    if (!pageData || pageData.length === 0) return null;

    const totals = {};
    columns.forEach(col => {
      // Sadece sayısal değer içerebilecek sütunları topla
      if (col.key !== 'kart_adi' && col.key !== 'banka' && col.key !== 'kart_no') {
        totals[col.dataIndex] = pageData.reduce((sum, record) => sum + (parseFloat(record[col.dataIndex]) || 0), 0);
      }
    });

    return (
      <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}>
        {/* 'Banka Adı' ve 'Kredi Kartı Adı' sütunlarını birleştir */}
        <Table.Summary.Cell index={0} fixed="left" colSpan={2} style={{textAlign: 'left'}}>
            <Title level={5} style={{ margin: 0 }}>Genel Toplam</Title>
        </Table.Summary.Cell>

        {/* 'Toplam Limit' sütununun toplamı */}
        <Table.Summary.Cell index={1} fixed="left">{formatCurrency(totals['limit'])}</Table.Summary.Cell>
        
        {/* 'Kullanılabilir Limit' sütununun toplamı */}
        <Table.Summary.Cell index={2}>
            <Text type="success" strong>{formatCurrency(totals['kullanilabilir'])}</Text>
        </Table.Summary.Cell>
        
        {/* Dinamik gün sütunları */}
        {days.map((day, index) => (
          <Table.Summary.Cell key={`summary-day-${index}`} index={index + 3}>
            {formatCurrency(totals[`${day}_${displayMode}`])}
          </Table.Summary.Cell>
        ))}
      </Table.Summary.Row>
    );
  };
return (
    <div className="page-container">
      {contextHolder}
      <h2>Kredi Kartı Durum Takibi</h2>
      
      <Spin spinning={loading}>
        {error && !loading && <div className="error-message">{error}</div>}
        <div className="card-list">
          {!loading && !error && creditCards.map(card => {
            // Bu kısım, CreditCard bileşenine doğru prop'ları hazırlamak için kalabilir
            const availableLimit = displayMode === 'sabah' 
                                  ? card.current_morning_limit 
                                  : card.current_evening_limit;
            const cardProps = {
              ...card,
              available_limit: parseFloat(availableLimit || 0),
              card_number: card.credit_card_no,
              expire_date: card.expiration_date,
              limit: card.limit,
              // === YENİ ===: Kartın durumunu da prop olarak gönderelim
              status: card.status || 'Aktif' 
            };
            
            return (
              // === YENİ: Tıklanabilir Wrapper ===
              // Her bir kartı, tıklandığında modal'ı açacak bir div ile sarıyoruz.
              <div 
                key={card.id} 
                className="clickable-card-wrapper" 
                onClick={() => handleCardClick(card)}
              >
                {/* Mevcut CreditCard bileşeniniz, durumu gösterecek şekilde güncellenmeli */}
                <CreditCard card={cardProps} />
              </div>
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
          summary={tableSummary}
        />
      </div>

      {/* --- MEVCUT MODALLAR --- */}
      <CreditCardDailyEntryModal 
        visible={isEntryModalVisible} 
        onCancel={() => setEntryModalVisible(false)} 
        onSave={handleSaveEntries} 
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

      {/* === YENİ: Kredi Kartı Detay ve Durum Değiştirme Modalı === */}
      {/* Bu modal, sadece bir kart seçildiğinde render edilir. */}
      {selectedCard && (
        <CreditCardDetailsModal
          visible={isDetailsModalVisible}
          onCancel={() => setIsDetailsModalVisible(false)}
          card={selectedCard}
          // Veri güncellendiğinde ana listeyi yenilemek için
          onDataUpdate={fetchData} 
          onStatusChange={handleUpdateCardDetails}
        />
      )}
    </div>
  );
};

export default CreditCardsPage;