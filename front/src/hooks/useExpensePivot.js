import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { getExpensePivot } from '../api/expenseService';

const transformPivotData = (json, selectedDate) => {
  if (!Array.isArray(json)) {
    console.error("Unexpected response format:", json);
    throw new Error("Gelen veri formatı beklenildiği gibi değil.");
  }

  const daysInMonth = selectedDate.daysInMonth();
  const grouped = {};

  json.forEach(g => {
    const gun = new Date(g.date).getDate();
    const groupKey = g.budget_item_name;

    if (!grouped[groupKey]) {
      grouped[groupKey] = [];
    }

    const key = `${g.budget_item_id}__${g.region_id}`;
    let row = grouped[groupKey].find(r => r.key === key);

    if (!row) {
      row = {
        key,
        id: g.region_id,
        region_id: g.region_id,
        budget_id: g.budget_item_id,
        budget_item_name: g.budget_item_name,
        bolge: g.region_name,
        description: g.description,
        toplam: 0,
        ...Array.from({ length: daysInMonth }, (_, i) => ({ [i + 1]: 0 }))
          .reduce((acc, cur) => ({ ...acc, ...cur }), {})
      };
      grouped[groupKey].push(row);
    }

    row[gun] = (row[gun] || 0) + Number(g.amount);
    row.toplam += Number(g.amount);
  });

  const finalData = [];
  Object.entries(grouped).forEach(([kalem, rows], index) => {
    finalData.push({ key: `header-${index}`, isHeader: true, ad: kalem });
    finalData.push(...rows);

    const groupTotal = {
      key: `footer-${index}`,
      isFooter: true,
      ad: "TOPLAM",
      toplam: rows.reduce((sum, r) => sum + r.toplam, 0),
    };

    for (let i = 1; i <= daysInMonth; i++) {
      groupTotal[i] = rows.reduce((sum, r) => sum + (r[i] || 0), 0);
    }
    finalData.push(groupTotal);
  });

  return finalData;
};

export const useExpensePivot = (selectedDate) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selectedDate) return;

    const abortController = new AbortController();
    const { signal } = abortController;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      const year = selectedDate.year();
      const month = (selectedDate.month() + 1).toString().padStart(2, '0');
      
      try {
        const json = await getExpensePivot(`${year}-${month}`, { signal });
        const transformedData = transformPivotData(json, selectedDate);
        setData(transformedData);
      } catch (e) {
        if (e.name !== 'CanceledError') {
          console.error("Failed to fetch or process pivot data:", e);
          setError(e);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      abortController.abort();
    };
  }, [selectedDate]);

  return { data, isLoading, error };
};
