// /front/src/features/credits/bank-logs/Screen2.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DatePicker from 'react-datepicker';
import { Toaster, toast } from 'react-hot-toast';
import { Button, Spin, message, Space } from 'antd';
import { PlusOutlined, EditOutlined, SaveOutlined, CloseOutlined, DownloadOutlined } from '@ant-design/icons';
import { produce } from 'immer';

import { fetchBalances, batchUpdateBalances, exportBalancesToExcel } from '../../../api/bankLogService';
import { createBank } from '../../../api/bankService';
import { createBankAccount } from '../../../api/bankAccountService';
import { BankCard } from './components/BankCard';
import { TotalsCard } from './components/TotalsCard';
import { ExchangeRateTicker } from './components/ExchangeRateTicker';
import { AddBankModal } from './components/AddBankModal';
import { styles } from './styles';
import './DatePicker.css';

import { bankLogoMap } from '../../../icons/bankLogoMap';

// Helper to format date to YYYY-MM-DD
const formatDate = (date) => {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
};

// Main Application Component
function BankLogsScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [period, setPeriod] = useState('morning');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [rates, setRates] = useState({ usd: '35.12', eur: '38.45', aed: '9.56', gbp: '44.50' });
  
  // New states for batch editing
  const [editMode, setEditMode] = useState(false);
  const [draftBalances, setDraftBalances] = useState([]);

  const queryClient = useQueryClient();
  const formattedDate = formatDate(selectedDate);

  const [isExporting, setIsExporting] = useState(false);

  const { data: originalData, isLoading, isError, error } = useQuery({
    queryKey: ['balances', formattedDate, period],
    queryFn: () => fetchBalances(formattedDate, period),
    enabled: !editMode, // Disable fetching when in edit mode
  });

  // Effect to populate draft state when original data is fetched
  useEffect(() => {
    if (originalData && Array.isArray(originalData.data)) {
      setDraftBalances(originalData.data);
    } else if (originalData) {
      console.warn('API returned non-array data for balances:', originalData);
      setDraftBalances([]); // Set to empty array to prevent crashes
    }
  }, [originalData]);

  const { mutate: addBank, isLoading: isAddingBank } = useMutation({
    mutationFn: async (bankData) => {
      const newBank = await createBank({ name: bankData.name });
      const accountPromises = bankData.accounts.map(account => 
        createBankAccount({ ...account, bank_id: newBank.id })
      );
      await Promise.all(accountPromises);
    },
    onSuccess: () => {
      message.success('Banka ve hesaplar başarıyla eklendi!');
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      setIsModalVisible(false);
    },
    onError: (error) => {
      message.error(`Hata: ${error.message}`);
    },
  });

  // --- GÜNCELLENMİŞ KOD ---
  const { mutate: saveBatch, isLoading: isSavingBatch } = useMutation({
    mutationFn: (payload) => batchUpdateBalances(payload),
    onSuccess: () => {
      toast.success('Tüm değişiklikler başarıyla kaydedildi!');
      
      // Sorguyu geçersiz kılarak verinin sunucudan yeniden çekilmesini sağlıyoruz.
      // Bu, hem hatayı çözer hem de sayfanın otomatik yenilenmesini sağlar.
      queryClient.invalidateQueries({ queryKey: ['balances', formattedDate, period] });

      setEditMode(false);
    },
    onError: (error) => {
      toast.error(`Hata: ${error.message}`);
    }
  });

  const handleExport = async () => {
    if (!selectedDate) {
        // GÜNCELLENDİ: message.error -> toast.error
        toast.error("Lütfen bir tarih seçin!");
        return;
    }

    setIsExporting(true);
    const dateStr = formatDate(selectedDate);

    try {
        const response = await exportBalancesToExcel(dateStr);
        
        const url = window.URL.createObjectURL(
            new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        );
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Bakiye_Raporu_${dateStr}.xlsx`);
        document.body.appendChild(link);
        link.click();
        
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);

        // GÜNCELLENDİ: message.success -> toast.success
        toast.success("Excel dosyası başarıyla indiriliyor.");

    } catch (error) {
        console.error("Export failed:", error); 

        if (error.response) {
            const status = error.response.status;
            if (status === 404) {
                // GÜNCELLENDİ: message.error -> toast.error
                toast.error("Seçili tarih için görüntülenecek veri bulunamadı.");
            } else {
                // GÜNCELLENDİ: message.error -> toast.error
                toast.error(`Sunucu hatası (Kod: ${status}). Excel dosyası oluşturulamadı.`);
            }
        } 
        else if (error.request) {
             // GÜNCELLENDİ: message.error -> toast.error
            toast.error("Sunucuya ulaşılamadı. Ağ bağlantınızı kontrol edin.");
        } 
        else {
             // GÜNCELLENDİ: message.error -> toast.error
            toast.error("Beklenmedik bir hata oluştu. Lütfen tekrar deneyin.");
        }
    } finally {
        setIsExporting(false);
    }
  };

  const handleBalanceChange = (bankId, field, value) => {
    setDraftBalances(
      produce(drafts => {
        const bankToUpdate = drafts.find(bank => bank.id === bankId);
        if (bankToUpdate && bankToUpdate.log) {
          bankToUpdate.log[field] = value;
        }
      })
    );
  };

  const handleCancelEdit = () => {
    if (originalData && Array.isArray(originalData.data)) {
      setDraftBalances(originalData.data); // Revert changes to the fetched data
    }
    setEditMode(false);
  };

  const handleSaveEdit = () => {
    const payload = draftBalances.filter(bank => bank.log).map(bank => ({
      ...bank.log,
      amount_try: parseFloat(bank.log.amount_try) || 0,
      amount_usd: parseFloat(bank.log.amount_usd) || 0,
      amount_eur: parseFloat(bank.log.amount_eur) || 0,
      amount_aed: parseFloat(bank.log.amount_aed) || 0,
      amount_gbp: parseFloat(bank.log.amount_gbp) || 0,
      rate_usd_try: rates.usd,
      rate_eur_try: rates.eur,
      rate_aed_try: rates.aed,
      rate_gbp_try: rates.gbp,
    }));
    saveBatch(payload);
  };

  const totals = useMemo(() => {
    return (draftBalances || []).reduce(
      (acc, bank) => {
        if (bank.log) {
          acc.total_try += parseFloat(bank.log.amount_try) || 0;
          acc.total_usd += parseFloat(bank.log.amount_usd) || 0;
          acc.total_eur += parseFloat(bank.log.amount_eur) || 0;
          acc.total_aed += parseFloat(bank.log.amount_aed) || 0;
          acc.total_gbp += parseFloat(bank.log.amount_gbp) || 0;
        }
        return acc;
      },
      { total_try: 0, total_usd: 0, total_eur: 0, total_aed: 0, total_gbp: 0 }
    );
  }, [draftBalances]);

  return (
    <div style={styles.container}>
      <Toaster position="top-right" reverseOrder={false} />

      <div style={styles.header}>
        <h1 style={styles.headerTitle}>Günlük Bakiye Girişi</h1>
        <div style={styles.controls}>
          <Button 
            icon={<DownloadOutlined />}
            onClick={handleExport}
            loading={isExporting}
            disabled={editMode} // Düzenleme modunda pasif yapalım
            >
            Excel'e Aktar
          </Button>
        
          {!editMode ? (
            <Button icon={<EditOutlined />} onClick={() => setEditMode(true)}>
              Toplu Düzenle
            </Button>
          ) : (
            <Space>
              <Button 
                type="primary" 
                icon={<SaveOutlined />} 
                onClick={handleSaveEdit}
                loading={isSavingBatch}
              >
                Kaydet
              </Button>
              <Button icon={<CloseOutlined />} onClick={handleCancelEdit} className="cancel-button">
                İptal
              </Button>
            </Space>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)} style={{ marginLeft: '10px' }}>
            Yeni Banka Ekle
          </Button>
          <div className="date-picker-wrapper">
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              maxDate={new Date()}
              dateFormat="dd/MM/yyyy"
              disabled={editMode}
            />
          </div>
          <div style={styles.toggleContainer}>
            <button
              style={period === 'morning' ? styles.toggleButtonActive : styles.toggleButton}
              onClick={() => !editMode && setPeriod('morning')}
              disabled={editMode}
            >
              Sabah
            </button>
            <button
              style={period === 'evening' ? styles.toggleButtonActive : styles.toggleButton}
              onClick={() => !editMode && setPeriod('evening')}
              disabled={editMode}
            >
              Akşam
            </button>
          </div>
        </div>
      </div>

      <div style={styles.mainLayout}>
        <div style={styles.content}>
          {(isLoading || isSavingBatch) && <div style={styles.centered}><Spin size="large" /></div>}
          {isError && <div style={styles.centeredError}>Hata: {error.message}</div>}
          
          {!isLoading && !isError && (
            <div style={styles.cardList}>
              <TotalsCard totals={totals} rates={rates} />
              {draftBalances.map(bank => (
                <BankCard 
                  key={bank.id} 
                  bankData={bank}
                  editMode={editMode}
                  onBalanceChange={handleBalanceChange}
                  currentRates={rates}
                  bankLogoMap={bankLogoMap}
                />
              ))}
            </div>
          )}
        </div>
        <div style={styles.sidebar}>
          <ExchangeRateTicker rates={rates} onRateChange={setRates} />
        </div>
      </div>
      
      <AddBankModal
        visible={isModalVisible}
        onOk={addBank}
        onCancel={() => setIsModalVisible(false)}
        loading={isAddingBank}
      />
    </div>
  );
}

// React Query Client Setup
const queryClient = new QueryClient();

export default function ProvidedBankLogsScreen() {
  return (
    <QueryClientProvider client={queryClient}>
      <BankLogsScreen />
    </QueryClientProvider>
  );
}
