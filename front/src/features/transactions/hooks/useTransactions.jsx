import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { useDebounce } from '../../../hooks/useDebounce';

export const useTransactions = (config) => {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({});
  const [sortInfo, setSortInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const debouncedSearchTerm = useDebounce(filters.description, 500);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const activeFilters = { ...filters };
      // Remove empty filters
      Object.keys(activeFilters).forEach(key => {
        const value = activeFilters[key];
        if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
          delete activeFilters[key];
        } else if (Array.isArray(value)) {
            activeFilters[key] = value.join(',');
        }
      });

      const params = {
        page: pagination.current,
        per_page: pagination.pageSize,
        sort_by: sortInfo.field,
        sort_order: sortInfo.order === 'ascend' ? 'asc' : 'desc',
        description: debouncedSearchTerm,
        ...activeFilters,
      };

      const response = await config.service.getAll(params);
      setData(response.data);
      setPagination(prev => ({ ...prev, total: response.pagination.total_items }));
    } catch (err) {
      const errorMessage = `Veriler yüklenirken bir hata oluştu: ${err.message}`;
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [
    config.service,
    pagination.current,
    pagination.pageSize,
    sortInfo,
    debouncedSearchTerm,
    filters,
    refreshKey
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = () => {
    setRefreshKey(oldKey => oldKey + 1);
  };

  const handleTableChange = (p, f, sorter) => {
    setPagination(prev => ({ ...prev, current: p.current, pageSize: p.pageSize }));
    setSortInfo({ field: sorter.field, order: sorter.order });
  };

  const applyFilters = (newFilters) => {
    setPagination(prev => ({ ...prev, current: 1 }));
    setFilters(newFilters);
  };

  return {
    data,
    pagination,
    filters,
    sortInfo,
    loading,
    error,
    fetchData,
    refresh,
    handleTableChange,
    applyFilters,
    setFilters,
  };
};
