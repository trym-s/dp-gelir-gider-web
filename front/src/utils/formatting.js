// src/utils/formatting.js

/**
 * Verilen tutarı ve para birimi kodunu kullanarak yerelleştirilmiş bir para birimi dizesi oluşturur.
 * @param {number|string} amount - Formatlanacak sayısal değer.
 * @param {string} currencyCode - 'USD', 'EUR', 'TRY' gibi 3 harfli ISO para birimi kodu.
 * @returns {string} Formatlanmış para birimi dizesi (ör: "1.250,50 ₺", "$500.00").
 */
export const formatCurrency = (amount, currencyCode = 'TRY') => {
  const numericAmount = parseFloat(amount);

  // Geçerli bir sayı değilse boş döndür
  if (isNaN(numericAmount)) {
    return '';
  }

  // Varsayılan olarak TRY kullan, eğer geçersiz bir kod gelirse
  const safeCurrencyCode = currencyCode || 'TRY';

  try {
    // tr-TR: Türkçe formatlama kuralları (nokta binlik, virgül ondalık ayıracı)
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: safeCurrencyCode,
      currencyDisplay: 'symbol', // <<== BU SATIRI EKLEYİN
    }).format(numericAmount);
  } catch (error) {
    // Eğer tarayıcı para birimi kodunu tanımazsa, varsayılan formatlamaya dön
    console.error("Para birimi formatlama hatası:", error);
    return `${numericAmount.toLocaleString('tr-TR')} ${safeCurrencyCode}`;
  }
};