import { formatCurrency, getStatusTag } from './helpers';

// Ödemeler için Tablo Sütunları
export const paymentTableColumns = [
  { title: 'Bölge', dataIndex: 'region', key: 'region', width: 150 },
  { title: 'Hesap Adı', dataIndex: 'account_name', key: 'account_name', width: 180, ellipsis: true },
  { title: 'Bütçe Kalemi', dataIndex: 'budget_item', key: 'budget_item', width: 180, ellipsis: true },
  { title: 'Ödenen Tutar', dataIndex: 'amount', key: 'amount', render: formatCurrency, align: 'right', width: 140 },
  { title: 'Gider Açıklaması', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: 'Ödeme Tarihi', dataIndex: 'date', key: 'date', width: 120, align: 'center' },
];

// Giderler için Tablo Sütunları
export const expenseTableColumns = [
  { title: 'Bölge', dataIndex: 'region', key: 'region', width: 150 },
  { title: 'Hesap Adı', dataIndex: 'account_name', key: 'account_name', width: 180, ellipsis: true },
  { title: 'Bütçe Kalemi', dataIndex: 'budget_item', key: 'budget_item', width: 180, ellipsis: true },
  { title: 'Tutar', dataIndex: 'amount', key: 'amount', render: formatCurrency, align: 'right', width: 140 },
  { title: 'Durum', dataIndex: 'status', key: 'status', render: (status) => getStatusTag(status, 'expense'), align: 'center', width: 130 },
  { title: 'Açıklama', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: 'Son Ödeme Tarihi', dataIndex: 'date', key: 'date', width: 120, align: 'center' },
];

// Tahsilatlar için Tablo Sütunları
export const receiptTableColumns = [
  { title: 'Müşteri Adı', dataIndex: 'customer_name', key: 'customer_name', width: 180, ellipsis: true },
  { title: 'Bölge', dataIndex: 'region', key: 'region', width: 140 },
  { title: 'Hesap Adı', dataIndex: 'account_name', key: 'account_name', width: 160, ellipsis: true },
  { title: 'Bütçe Kalemi', dataIndex: 'budget_item', key: 'budget_item', width: 160, ellipsis: true },
  { title: 'Alınan Tutar', dataIndex: 'amount', key: 'amount', render: formatCurrency, align: 'right', width: 150 },
  { title: 'Gelir Açıklaması', dataIndex: 'income.description', key: 'income_description', ellipsis: true },
  { title: 'Tahsilat Tarihi', dataIndex: 'date', key: 'date', width: 130, align: 'center' },
];

// Gelirler için Tablo Sütunları
export const incomeTableColumns = [
  { title: 'Müşteri Adı', dataIndex: 'customer_name', key: 'customer_name', width: 180, ellipsis: true },
  { title: 'Bölge', dataIndex: 'region', key: 'region', width: 140 },
  { title: 'Hesap Adı', dataIndex: 'account_name', key: 'account_name', width: 160, ellipsis: true },
  { title: 'Bütçe Kalemi', dataIndex: 'budget_item', key: 'budget_item', width: 160, ellipsis: true },
  { title: 'Tutar', dataIndex: 'amount', key: 'amount', render: formatCurrency, align: 'right', width: 150 },
  { title: 'Durum', dataIndex: 'status', key: 'status', render: (status) => getStatusTag(status, 'income'), align: 'center', width: 130 },
  { title: 'Açıklama', dataIndex: 'income_description', key: 'income_description', ellipsis: true },
  { title: 'Tahsilat Tarihi', dataIndex: 'date', key: 'date', width: 130, align: 'center' },
];
