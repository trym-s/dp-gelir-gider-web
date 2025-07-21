// /front/src/features/credits/bank-logs/Screen2.jsx
import React, { useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DatePicker from 'react-datepicker';
import { Toaster, toast } from 'react-hot-toast';
import { Button, Spin, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

import { api } from './api';
import { BankCard } from './components/BankCard';
import { ExchangeRateTicker } from './components/ExchangeRateTicker';
import { AddBankModal } from './components/AddBankModal';
import { styles } from './styles';

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

  const queryClient = useQueryClient();
  const formattedDate = formatDate(selectedDate);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['balances', formattedDate, period],
    queryFn: () => api.fetchBalances(formattedDate, period),
    placeholderData: (prevData) => prevData,
  });

  const { mutate: addBank, isLoading: isAddingBank } = useMutation({
    mutationFn: api.addBank,
    onSuccess: () => {
      message.success('Banka başarıyla eklendi!');
      // Invalidate the balances query to refetch the list, which will include the new bank
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      setIsModalVisible(false);
    },
    onError: (error) => {
      message.error(`Hata: ${error.message}`);
    },
  });

  return (
    <div style={styles.container}>
      <Toaster position="top-right" reverseOrder={false} />

      <div style={styles.header}>
        <h1 style={styles.headerTitle}>Günlük Bakiye Girişi</h1>
        <div style={styles.controls}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
            Yeni Banka Ekle
          </Button>
          <div style={styles.datePickerWrapper}>
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              maxDate={new Date()}
              dateFormat="dd/MM/yyyy"
            />
          </div>
          <div style={styles.toggleContainer}>
            <button
              style={period === 'morning' ? styles.toggleButtonActive : styles.toggleButton}
              onClick={() => setPeriod('morning')}
            >
              Sabah
            </button>
            <button
              style={period === 'evening' ? styles.toggleButtonActive : styles.toggleButton}
              onClick={() => setPeriod('evening')}
            >
              Akşam
            </button>
          </div>
        </div>
      </div>

      <div style={styles.mainLayout}>
        <div style={styles.content}>
          {isLoading && <div style={styles.centered}><Spin size="large" /></div>}
          {isError && <div style={styles.centeredError}>Hata: {error.message}</div>}
          
          {!isLoading && !isError && (
            <div style={styles.cardList}>
              {data?.map(balance => {
                const isPersisted = !balance.id.toString().startsWith('new-');
                return (
                  <BankCard 
                    key={balance.id} 
                    balanceData={balance}
                    period={period}
                    date={formattedDate}
                    isPersisted={isPersisted}
                  />
                );
              })}
            </div>
          )}
        </div>
        <div style={styles.sidebar}>
          <ExchangeRateTicker />
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