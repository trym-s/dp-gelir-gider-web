import { useState, useEffect } from 'react';

const transformPivotData = (json, selectedDate, config) => {
  if (!Array.isArray(json)) {
    console.error("Unexpected response format:", json);
    throw new Error("Gelen veri formatı beklenildiği gibi değil.");
  }

  const daysInMonth = selectedDate.daysInMonth();
  const groupedByBudgetItem = {};

  json.forEach(item => {
    const budgetItemName = item.budget_item_name;
    if (!groupedByBudgetItem[budgetItemName]) {
      groupedByBudgetItem[budgetItemName] = [];
    }
    groupedByBudgetItem[budgetItemName].push(item);
  });

  const finalData = [];
  Object.entries(groupedByBudgetItem).forEach(([budgetItemName, items], index) => {
    const children = items.map((item, childIndex) => {
      const day = new Date(item.date).getDate();
      const childRow = {
        key: `child-${index}-${childIndex}`,
        description: item.description,
        toplam: Number(item.amount),
        ...config.pivot.getChildRowData(item), // Get entity-specific data
      };
      for (let i = 1; i <= daysInMonth; i++) {
        childRow[i] = i === day ? Number(item.amount) : 0;
      }
      return childRow;
    });

    const parentRow = {
      key: `group-${index}`,
      budget_item_name: budgetItemName,
      children: children,
      toplam: children.reduce((sum, r) => sum + r.toplam, 0),
    };

    for (let i = 1; i <= daysInMonth; i++) {
      parentRow[i] = children.reduce((sum, r) => sum + (r[i] || 0), 0);
    }
    
    finalData.push(parentRow);
  });

  return finalData;
};


export const useTransactionPivot = (selectedDate, config) => {
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
        const json = await config.service.getPivot(`${year}-${month}`, { signal });
        const transformedData = transformPivotData(json, selectedDate, config);
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
  }, [selectedDate, config]);

  return { data, isLoading, error };
};
