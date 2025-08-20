
import React from 'react';
import { Tag } from 'antd';

// Para birimi formatlama (currency ve locale parametreli)
export const formatCurrency = (value, currency = 'TRY', locale = 'tr-TR') => {
  const v = value == null ? 0 : Number(value);
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(v);
  } catch {
    return `${v.toLocaleString(locale, { maximumFractionDigits: 2 })} ${currency}`;
  }
};

export const getStatusTag = (status, type = 'expense') => {
  const statusMap = {
    expense: {
      PAID: { color: 'green', text: 'Ödendi' },
      UNPAID: { color: 'red', text: 'Ödenmedi' },
      PARTIALLY_PAID: { color: 'orange', text: 'Kısmi Ödendi' },
      OVERPAID: { color: 'purple', text: 'Fazla Ödendi' },
    },
    income: {
      RECEIVED: { color: 'green', text: 'Alındı' },
      UNRECEIVED: { color: 'red', text: 'Alınmadı' },
      PARTIALLY_RECEIVED: { color: 'orange', text: 'Kısmi Alındı' },
      OVER_RECEIVED: { color: 'purple', text: 'Fazla Alındı' },
    },
  };
  const map = statusMap[type] || {};
  const { color, text } = map[status] || { color: 'default', text: status };
  return <Tag color={color}>{text}</Tag>;
};

