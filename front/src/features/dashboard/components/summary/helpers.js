import React from 'react';
import { Tag } from 'antd';

// Para birimi formatlama fonksiyonu
export const formatCurrency = (value) => {
    if (value == null) return "0,00 ₺";
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
};

// Durum metnine göre renkli etiket döndüren fonksiyon
export const getStatusTag = (status, type = 'expense') => {
  const statusMap = {
    expense: {
      'PAID': { color: 'green', text: 'Ödendi' },
      'UNPAID': { color: 'red', text: 'Ödenmedi' },
      'PARTIALLY_PAID': { color: 'orange', text: 'Kısmi Ödendi' },
      'OVERPAID': {color:'purple',text:'Fazla Ödendi'},
    },
    income: {
      'RECEIVED': { color: 'green', text: 'Alındı' },
      'UNRECEIVED': { color: 'red', text: 'Alınmadı' },
      'PARTIALLY_RECEIVED': { color: 'orange', text: 'Kısmi Alındı' },
      'OVER_RECEIVED': { color: 'purple', text: 'Fazla Alındı' },
    }
  };
  const map = statusMap[type] || {};
  const { color, text } = map[status] || { color: 'default', text: status };
  return <Tag color={color}>{text}</Tag>;
};
