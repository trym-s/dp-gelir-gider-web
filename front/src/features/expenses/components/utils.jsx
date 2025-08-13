
// front/src/features/expenses/components/import-wizard/utils.js
import dayjs from "dayjs";

export const nf = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });
export const fmtTL = (v) => nf.format(Number(v || 0)) + " ₺";
export const fmtDate = (v) => (v ? dayjs(v).format("DD/MM/YYYY") : "—");

export const normalizeExpenseItem = (item) => ({
  ...item,
  date: item.date || item.transaction_date || item.invoice_date || null,
  invoice_number: item.invoice_number || "",
  invoice_name: item.invoice_name || item.description || "",
  supplier: item.supplier || item.vendor || "",
  amount: item.amount ?? item.total ?? 0,
  total_paid: item.total_paid ?? 0,
  last_payment_date: item.last_payment_date || null,
  account_name: item.account_name || "",
  lines: Array.isArray(item.lines) ? item.lines : [],
});
