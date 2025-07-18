// Bu veri, her bir kart için yapılmış harcamaları ve ödemeleri simüle eder.
export const mockTransactions = [
  // Yapı Kredi (cardId: 1)
  { id: 101, cardId: 1, type: 'expense', description: 'Trendyol Alışverişi', amount: 1250.50, date: '2025-07-15' },
  { id: 102, cardId: 1, type: 'expense', description: 'Netflix Aboneliği', amount: 229.99, date: '2025-07-12' },
  { id: 103, cardId: 1, type: 'payment', description: 'Maaş Hesabından Ödeme', amount: 5000.00, date: '2025-07-10' },
  { id: 104, cardId: 1, type: 'expense', description: 'Migros Market', amount: 850.75, date: '2025-07-08' },

  // QNB Finansbank (cardId: 2)
  { id: 201, cardId: 2, type: 'expense', description: 'Hepsiburada', amount: 3450.00, date: '2025-07-18' },
  { id: 202, cardId: 2, type: 'payment', description: 'Ekstre Ödemesi', amount: 10000.00, date: '2025-07-09' },

  // Ziraat Bankası (cardId: 3)
  { id: 301, cardId: 3, type: 'expense', description: 'Akaryakıt Alımı', amount: 1500.00, date: '2025-07-16' },

  // İş Bankası (cardId: 4)
  { id: 401, cardId: 4, type: 'expense', description: 'Uçak Bileti', amount: 4800.00, date: '2025-07-14' },
  { id: 402, cardId: 4, type: 'expense', description: 'Restoran Harcaması', amount: 1750.00, date: '2025-07-11' },
  { id: 403, cardId: 4, type: 'payment', description: 'Nakit Avans Kapatma', amount: 2000.00, date: '2025-07-05' },
];
