import { useState, useEffect } from 'react';
import { getDashboardSummary } from '../api/dashboardService';

export const useDashboardSummary = (currentMonth) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Her yeni istek için bir AbortController oluştur
    const abortController = new AbortController();
    const signal = abortController.signal;

    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const monthString = currentMonth.toISOString().slice(0, 7);
        const data = await getDashboardSummary(monthString, { signal });
        setSummary(data);
      } catch (err) {
        if (err.name !== 'CanceledError') { // İstek iptal edildiyse hata gösterme
          const errorMessage = err.response ? JSON.stringify(err.response.data) : err.message;
          setError(`Summary data could not be loaded: ${errorMessage}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();

    // Cleanup fonksiyonu: component unmount olduğunda veya currentMonth değiştiğinde
    // bir önceki isteği iptal et.
    return () => {
      abortController.abort();
    };
  }, [currentMonth]); // Sadece currentMonth değiştiğinde çalışır

  return { summary, loading, error };
};
