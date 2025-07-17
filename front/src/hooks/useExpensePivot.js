import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { getExpensePivot } from '../api/expenseService';

const transformPivotData = (json, selectedDate) => {
  if (!Array.isArray(json)) {
    console.error("Unexpected response format:", json);
    throw new Error("Gelen veri formatı beklenildiği gibi değil.");
  }

  const daysInMonth = selectedDate.daysInMonth();
  const groupedByBudgetItem = {};

  json.forEach((item) => {
    const day = new Date(item.date).getDate();
    const parentKey = item.budget_item_name;

    if (!grouped[parentKey]) {
      grouped[parentKey] = {
        key: parentKey,
        budget_item_name: parentKey,
        children: []
      };
    }

    const childKey = `${item.budget_item_id}_${item.region_id}_${item.account_name_id}_${item.description}`;
    let existingChild = grouped[parentKey].children.find((c) => c.key === childKey);

    if (!existingChild) {
      existingChild = {
        key: childKey,
        region_name: item.region_name,
        account_name: item.account_name,
        description: item.description,
        toplam: 0,
        ...Array.from({ length: daysInMonth }, (_, i) => ({ [i + 1]: 0 }))
          .reduce((acc, cur) => ({ ...acc, ...cur }), {})
      };
      grouped[parentKey].children.push(existingChild);
    }

    existingChild[day] = (existingChild[day] || 0) + Number(item.amount);
    existingChild.toplam += Number(item.amount);
  });

  return Object.values(grouped);
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
