import { useState, useEffect } from 'react';

/**
 * Bir değeri geciktirerek (debounce) döndüren özel bir React hook'u.
 * Kullanıcı yazmayı bıraktığında API çağrısı yapmak gibi işlemler için idealdir.
 * @param {any} value Geciktirilecek değer (örn: arama metni).
 * @param {number} delay Gecikme süresi (milisaniye).
 * @returns Geciktirilmiş değeri döndürür.
 */
export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Değer değiştiğinde, belirtilen gecikme süresi sonunda
    // debouncedValue'yu güncelleyecek bir zamanlayıcı ayarla.
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Eğer `value` veya `delay` tekrar değişirse, bu useEffect yeniden çalışır.
    // Yeniden çalışmadan önce, bir önceki zamanlayıcıyı temizler.
    // Bu, kullanıcının hızlıca yazmaya devam etmesi durumunda
    // gereksiz güncellemeleri önler.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Sadece value veya delay değiştiğinde bu efekti yeniden çalıştır.

  return debouncedValue;
}
