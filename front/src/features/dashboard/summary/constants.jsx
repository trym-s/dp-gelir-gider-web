
import React from 'react';
import { formatCurrency, getStatusTag } from './helpers';

/**
 * Antd Table column factory'leri – hiçbir yerde string + React node birleştirmiyoruz.
 * Amount sütunları SADECE currency-formatlı string döndürür.
 */

export const makePaymentTableColumns = (currency = 'TRY') => [
  { title: 'Bölge', dataIndex: 'region', key: 'region', width: 150 },
  { title: 'Hesap Adı', dataIndex: 'account_name', key: 'account_name', width: 180, ellipsis: true },
  { title: 'Bütçe Kalemi', dataIndex: 'budget_item', key: 'budget_item', width: 180, ellipsis: true },
  {
    title: 'Ödenen Tutar',
    dataIndex: 'amount',
    key: 'amount',
    align: 'right',
    width: 140,
    render: (val) => formatCurrency(val, currency),
  },
  { title: 'Gider Açıklaması', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: 'Ödeme Tarihi', dataIndex: 'date', key: 'date', width: 120, align: 'center' },
];

export const makeExpenseTableColumns = (currency = 'TRY', amountTitle = 'Tutar') => [
  { title: 'Bölge', dataIndex: 'region', key: 'region', width: 150 },
  { title: 'Hesap Adı', dataIndex: 'account_name', key: 'account_name', width: 180, ellipsis: true },
  { title: 'Bütçe Kalemi', dataIndex: 'budget_item', key: 'budget_item', width: 180, ellipsis: true },
  {
    title: amountTitle, // "Tutar" veya "Kalan Tutar"
    dataIndex: 'amount',
    key: 'amount',
    align: 'right',
    width: 140,
    render: (val) => formatCurrency(val, currency),
  },
  {
    title: 'Durum',
    dataIndex: 'status',
    key: 'status',
    align: 'center',
    width: 130,
    render: (status) => getStatusTag(status, 'expense'),
  },
  { title: 'Açıklama', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: 'Son Ödeme Tarihi', dataIndex: 'date', key: 'date', width: 120, align: 'center' },
];

export const makeReceiptTableColumns = (currency = 'TRY') => [
  { title: 'Müşteri Adı', dataIndex: 'customer_name', key: 'customer_name', width: 180, ellipsis: true },
  { title: 'Bölge', dataIndex: 'region', key: 'region', width: 140 },
  { title: 'Hesap Adı', dataIndex: 'account_name', key: 'account_name', width: 160, ellipsis: true },
  { title: 'Bütçe Kalemi', dataIndex: 'budget_item', key: 'budget_item', width: 160, ellipsis: true },
  {
    title: 'Alınan Tutar',
    dataIndex: 'amount',
    key: 'amount',
    align: 'right',
    width: 140,
    render: (val) => formatCurrency(val, currency),
  },
  { title: 'Tahsilat Tarihi', dataIndex: 'date', key: 'date', width: 120, align: 'center' },
];

export const makeIncomeTableColumns = (currency = 'TRY', totalTitle = 'Toplam Tutar') => [
  { title: 'Müşteri Adı', dataIndex: 'customer_name', key: 'customer_name', width: 180, ellipsis: true },
  { title: 'Bölge', dataIndex: 'region', key: 'region', width: 140 },
  { title: 'Hesap Adı', dataIndex: 'account_name', key: 'account_name', width: 160, ellipsis: true },
  { title: 'Bütçe Kalemi', dataIndex: 'budget_item', key: 'budget_item', width: 160, ellipsis: true },
  {
    title: totalTitle, // "Toplam Tutar" veya "Alınacak Tutar"
    dataIndex: 'total_amount',
    key: 'total_amount',
    align: 'right',
    width: 140,
    render: (val) => formatCurrency(val, currency),
  },
  {
    title: 'Alınan Tutar',
    dataIndex: 'received_amount',
    key: 'received_amount',
    align: 'right',
    width: 140,
    render: (val) => formatCurrency(val, currency),
  },
  {
    title: 'Durum',
    dataIndex: 'status',
    key: 'status',
    align: 'center',
    width: 130,
    render: (status) => getStatusTag(status, 'income'),
  },
  { title: 'Fatura Tarihi', dataIndex: 'date', key: 'date', width: 120, align: 'center' },
];

