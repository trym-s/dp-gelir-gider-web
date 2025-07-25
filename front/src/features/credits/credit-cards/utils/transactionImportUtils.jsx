import { parse, format, isValid } from 'date-fns';

/**
 * Excel'den gelen tek bir ham satırı alır,
 * işler, doğrular ve arayüz için hazır hale getirir.
 * @param {object} rawRow - xlsx.js'den gelen satır nesnesi
 * @returns {object} - TransactionConfirmationStep bileşeninin beklediği formatta nesne
 */
export function mapAndValidateRow(rawRow) {
  const errors = [];
  const cleanData = {};

  // --- Alan 1: Tarihi Dönüştür ve Doğrula ---
  const dateStr = rawRow["İşlem Tarihi"];
  if (dateStr) {
    const parsedDate = parse(String(dateStr), 'dd/MM/yyyy', new Date());
    if (isValid(parsedDate)) {
      cleanData.transaction_date = format(parsedDate, 'yyyy-MM-dd');
    } else {
      errors.push("Geçersiz tarih formatı.");
    }
  } else {
    errors.push("Tarih alanı boş.");
  }

  // --- Alan 2: Tutarı Doğrula ---
  const amount = rawRow["Tutar (TL)"];
  if (typeof amount === 'number' && !isNaN(amount)) {
    cleanData.amount = amount;
  } else {
    errors.push("Tutar geçerli bir sayı değil.");
  }

  // --- Alan 3: Açıklamayı Ata ---
  cleanData.description = rawRow["Açıklama"] || "Açıklama yok";

  // --- Alan 4: İşlem Tipini Ata (Sabit: EXPENSE) ---
  cleanData.type = "EXPENSE";
  
  // --- SONUÇ NESNESİNİ OLUŞTUR (YENİ FORMAT) ---
  const isRowValid = errors.length === 0;

  return {
    key: crypto.randomUUID(), // Ant Design Table için 'key'
    date: cleanData.transaction_date,
    description: cleanData.description,
    amount: cleanData.amount,
    status: isRowValid ? 'valid' : 'invalid',
    error: isRowValid ? null : errors.join(' '), // Hataları tek bir string yap
    // API'ye göndermek için temiz veriyi de saklayalım
    cleanApiData: isRowValid ? cleanData : null
  };
}

/**
 * Kullanıcı onayından sonra API için veri paketler.
 * @param {Array} processedRows - mapAndValidateRow ile işlenmiş satırların dizisi
 * @param {Set} selectedKeys - Kullanıcının arayüzde seçtiği satırların key'lerini içeren Set
 * @param {number} creditCardId - Kredi kartı ID'si
 * @returns {object} - API'ye gönderilmeye hazır paket
 */
export function preparePayloadForApi(processedRows, selectedKeys, creditCardId) {
  // Set'i Array'e çevirerek daha kolay arama yapalım
  const selectedKeysArray = Array.from(selectedKeys);

  // 1. Sadece geçerli ve kullanıcı tarafından seçilmiş satırları filtrele
  const selectedTransactions = processedRows
    .filter(row => selectedKeysArray.includes(row.key))
    .map(row => row.cleanApiData); // Sadece API için hazırlanan temiz veriyi al

  // 2. Nihai API gövdesini oluştur
  const payload = {
    credit_card_id: creditCardId,
    transactions: selectedTransactions
  };

  console.log("API'ye Gönderilmeye Hazır Paket:", payload);
  return payload;
}