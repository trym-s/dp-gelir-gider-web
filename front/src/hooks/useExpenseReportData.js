import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { getExpenses } from '../api/expenseService'; // Assuming getExpenses fetches all necessary data

// This function transforms flat expense data into a hierarchical structure for the report
function processPivotData(expenses, year, month, daysInMonth) {
  const hierarchy = {};

  expenses.forEach((g) => {
    const date = dayjs(g.date);
    if (date.year() !== year || date.month() + 1 !== month) return;

    const paymentType = g.payment_type?.name || 'Belirtilmemiş';
    const budgetItem = g.budget_item?.name || 'Belirtilmemiş';
    const accountName = g.account_name?.name || 'Belirtilmemiş';

    if (!hierarchy[paymentType]) hierarchy[paymentType] = {};
    if (!hierarchy[paymentType][budgetItem]) hierarchy[paymentType][budgetItem] = {};
    if (!hierarchy[paymentType][budgetItem][accountName]) {
      hierarchy[paymentType][budgetItem][accountName] = Array(daysInMonth).fill(0);
    }
    
    const day = date.date();
    hierarchy[paymentType][budgetItem][accountName][day - 1] += g.amount;
  });

  const rows = [];
  Object.entries(hierarchy).forEach(([paymentType, budgetItems], idx1) => {
    const paymentRow = { key: `payment-${idx1}`, type: "odemeTuru", ad: paymentType, children: [] };
    Object.entries(budgetItems).forEach(([budgetItem, accounts], idx2) => {
      const budgetItemRow = { key: `item-${idx1}-${idx2}`, type: "butceKalemi", ad: budgetItem, children: [] };
      Object.entries(accounts).forEach(([accountName, amounts], idx3) => {
        const accountRow = { key: `account-${idx1}-${idx2}-${idx3}`, type: "hesapAdi", ad: accountName };
        for (let i = 1; i <= daysInMonth; i++) {
          accountRow[`gun${i}`] = amounts[i - 1] || 0;
        }
        budgetItemRow.children.push(accountRow);
      });

      if (budgetItemRow.children.length > 0) {
        const totals = Array(daysInMonth).fill(0);
        Object.values(accounts).forEach((amounts) => {
          for (let i = 0; i < daysInMonth; i++) {
            totals[i] += amounts[i] || 0;
          }
        });
        const totalRow = { key: `total-${idx1}-${idx2}`, type: "toplam", ad: "Toplam" };
        for (let i = 1; i <= daysInMonth; i++) {
          totalRow[`gun${i}`] = totals[i - 1] || 0;
        }
        budgetItemRow.children.push(totalRow);
      }
      paymentRow.children.push(budgetItemRow);
    });
    rows.push(paymentRow);
  });
  return rows;
}

export const useExpenseReportData = (selectedMonth) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selectedMonth) return;

    const abortController = new AbortController();
    const { signal } = abortController;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const startDate = selectedMonth.startOf('month').format('YYYY-MM-DD');
        const endDate = selectedMonth.endOf('month').format('YYYY-MM-DD');
        
        // Fetch all expenses for the month
        const response = await getExpenses({ date_start: startDate, date_end: endDate, per_page: 1000, signal });
        
        const daysInMonth = selectedMonth.daysInMonth();
        const year = selectedMonth.year();
        const month = selectedMonth.month() + 1;
        
        const processedData = processPivotData(response.data, year, month, daysInMonth);
        setData(processedData);
      } catch (err) {
        if (err.name !== 'CanceledError') {
          setError(err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      abortController.abort();
    };
  }, [selectedMonth]);

  return { data, loading, error };
};
