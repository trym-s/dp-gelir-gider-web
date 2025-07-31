// /front/src/features/credits/bank-logs/Screen2.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DatePicker from 'react-datepicker';
import { Toaster, toast } from 'react-hot-toast';
import { Button, Spin, message, Space } from 'antd';
import { PlusOutlined, EditOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { produce } from 'immer';

import { fetchBalances, batchUpdateBalances } from '../../../api/bankLogService';
import { createBank } from '../../../api/bankService';
import { createBankAccount } from '../../../api/bankAccountService';
import { BankCard } from './components/BankCard';
import { TotalsCard } from './components/TotalsCard';
import { ExchangeRateTicker } from './components/ExchangeRateTicker';
import { AddBankModal } from './components/AddBankModal';
import { styles } from './styles';
import './DatePicker.css';

const bankLogoMap = {
  'Akbank': '/bank_logo/Akbank-icon.png',
  'TEB': '/bank_logo/Teb-icon.png',
  'Yapi Kredi': '/bank_logo/Yapi-Kredi-Logo.png',
  'TFKB': '/bank_logo/tfkb-logo.png',  
  'Garanti BBVA': '/bank_logo/garanti-logo.png',
  'Is Bankasi': '/bank_logo/is-bankasi-logo.png',
  'Ziraat Bankasi': '/bank_logo/ziraat-logo.png',
  'QNB': '/bank_logo/qnb-logo.png',
  'Vakifbank': '/bank_logo/vakifbank-logo.png',
  'default': '/default-bank-logo.png' 
};

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
      // Handle cases where API might return a non-array response unexpectedly
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

  const { mutate: saveBatch, isLoading: isSavingBatch } = useMutation({
    mutationFn: (payload) => batchUpdateBalances(payload),
    onSuccess: (updatedData) => {
      toast.success('Tüm değişiklikler başarıyla kaydedildi!');
      
      queryClient.setQueryData(['balances', formattedDate, period], (oldData) => {
        if (!oldData) return updatedData;

        // Create a map of the new data for easy lookup
        const updatedDataMap = new Map(updatedData.map(item => [item.id, item]));

        // Merge the new data with the old data
        return oldData.map(oldItem => {
          const newItem = updatedDataMap.get(oldItem.id);
          if (newItem) {
            // If the item was updated, merge it with the old item to preserve nested data
            return { ...oldItem, ...newItem };
          }
          // If the item was not updated, return the old item
          return oldItem;
        });
      });

      setEditMode(false);
    },
    onError: (error) => {
      toast.error(`Hata: ${error.message}`);
    }
  });

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
    setDraftBalances(originalData); // Revert changes
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
      rate_usd_try: bank.log.rate_usd_try || rates.usd,
      rate_eur_try: bank.log.rate_eur_try || rates.eur,
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
              <Button icon={<CloseOutlined />} onClick={handleCancelEdit}>
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