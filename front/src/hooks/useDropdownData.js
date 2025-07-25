import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { getRegions } from '../api/regionService';
import { getPaymentTypes } from '../api/paymentTypeService';
import { getAccountNames } from '../api/accountNameService';
import { getBudgetItems } from '../api/budgetItemService';
import { getCustomers } from '../api/customerService';

export const useDropdownData = () => {
  const [data, setData] = useState({
    regions: [],
    paymentTypes: [],
    accountNames: [],
    budgetItems: [],
    customers: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [regions, paymentTypes, accountNames, budgetItems, customers] = await Promise.all([
        getRegions(),
        getPaymentTypes(),
        getAccountNames(),
        getBudgetItems(),
        getCustomers(),
      ]);
      setData({ regions, paymentTypes, accountNames, budgetItems, customers });
    } catch (error) {
      message.error("Form verileri yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...data, loading, refetch: fetchData };
};